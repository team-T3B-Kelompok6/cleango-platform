import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { AppError } from '../lib/AppError.js';
import { addressSql } from '../lib/address-display.js';
import { pool } from '../lib/db.js';

import {
  canTransition,
  OrderStatusTransitionError,
  statusLabel,
} from '../lib/order-status.js';
import {
  createLinkToken,
  hashToken,
  linkExpiresAt,
} from './cleaner-task.model.js';

const MAX_STAFF_PER_ORDER = 1;

type DatabaseOrderStatus =
  | 'awaiting_payment'
  | 'confirmed'
  | 'assigned'
  | 'departed'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

interface OrderRow extends RowDataPacket {
  id: number;
  customerId: number;
  customer: string;
  address: string;
  latitude: number | string | null;
  longitude: number | string | null;
  service: string;
  price: number;
  date: string;
  time: string;
  staffNames: string;
  databaseStatus: DatabaseOrderStatus;
  paymentStatus: string | null;
  notes: string;
}

export interface Order {
  id: string;
  customerId: string;
  customer: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  service: string;
  price: number;
  date: string;
  time: string;
  staff: string[];
  status:
    | 'Menunggu Assign'
    | 'Menunggu Lokasi'
    | 'Menuju Lokasi'
    | 'Sedang Dikerjakan'
    | 'Selesai'
    | 'Batal';
  notes: string;
  paymentStatus: string | null;
}

const orderSelect = `SELECT b.id, b.customer_id AS customerId,
  u.name AS customer,
  ${addressSql('a')} AS address,
  a.latitude, a.longitude,
  s.name AS service, b.total_amount AS price,
  DATE_FORMAT(b.scheduled_date, '%Y-%m-%d') AS date,
  TIME_FORMAT(b.scheduled_start_time, '%H:%i') AS time,
  COALESCE((
    SELECT GROUP_CONCAT(c.name ORDER BY ca.assigned_at SEPARATOR '|||')
    FROM cleaner_assignments ca
    INNER JOIN cleaners c ON c.id = ca.cleaner_id
    WHERE ca.booking_id = b.id
  ), '') AS staffNames,
  b.status AS databaseStatus,
  p.status AS paymentStatus,
  COALESCE(b.customer_notes, '') AS notes
  FROM bookings b
  INNER JOIN users u ON u.id = b.customer_id
  INNER JOIN addresses a ON a.id = b.address_id
  INNER JOIN services s ON s.id = b.service_id
  LEFT JOIN payments p ON p.booking_id = b.id`;

function apiStatus(status: DatabaseOrderStatus): Order['status'] {
  return statusLabel(status) as Order['status'];
}

const API_STATUS_TO_DATABASE: Record<string, DatabaseOrderStatus> = {
  'Menunggu Assign': 'confirmed',
  'Menunggu Lokasi': 'assigned',
  'Menuju Lokasi': 'en_route',
  'Sedang Dikerjakan': 'in_progress',
  Selesai: 'completed',
  Batal: 'cancelled',
};

export const ORDER_STATUSES = Object.keys(API_STATUS_TO_DATABASE);

function mapOrder(row: OrderRow): Order {
  return {
    id: String(row.id),
    customerId: String(row.customerId),
    customer: row.customer,
    address: row.address,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    service: row.service,
    price: row.price,
    date: row.date,
    time: row.time,
    staff: row.staffNames ? row.staffNames.split('|||') : [],
    status: apiStatus(row.databaseStatus),
    notes: row.notes,
    paymentStatus: row.paymentStatus ?? null,
  };
}

export async function listOrders(): Promise<Order[]> {
  const [rows] = await pool.query<OrderRow[]>(
    `${orderSelect} ORDER BY b.created_at DESC, b.id DESC`,
  );
  return rows.map(mapOrder);
}

export async function findOrder(id: number): Promise<Order | null> {
  const [rows] = await pool.query<OrderRow[]>(
    `${orderSelect} WHERE b.id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ? mapOrder(rows[0]) : null;
}

export interface OrderWriteInput {
  customerId?: number;
  customerName?: string;
  serviceName?: string;
  date?: string;
  time?: string;
  price?: number;
  status?: string;
  notes?: string;
  phone?: string;
  address?: string;
  staff?: string[];
}

function toDatabaseStatus(status: string | undefined): DatabaseOrderStatus | undefined {
  if (status === undefined) return undefined;
  return API_STATUS_TO_DATABASE[status];
}

async function resolveServiceId(name: string): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM services WHERE name = ? AND is_active = TRUE LIMIT 1',
    [name],
  );
  if (!rows[0]) throw new Error('SERVICE_NOT_FOUND');
  return Number(rows[0].id);
}

async function resolveAddressId(customerId: number): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM addresses WHERE user_id = ? AND is_primary = TRUE LIMIT 1',
    [customerId],
  );
  if (!rows[0]) throw new Error('ADDRESS_NOT_FOUND');
  return Number(rows[0].id);
}

export async function insertBooking(input: {
  customerId: number;
  customerName: string;
  serviceName: string;
  date: string;
  time: string;
  price: number;
  status: string;
  notes: string;
}): Promise<Order> {
  const serviceId = await resolveServiceId(input.serviceName);
  const addressId = await resolveAddressId(input.customerId);
  const code = `CG-${Date.now().toString(36).toUpperCase()}`;
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO bookings
       (booking_code, customer_id, service_id, address_id, scheduled_date,
        scheduled_start_time, customer_notes, service_price, platform_fee,
        discount_amount, total_amount, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
    [
      code,
      input.customerId,
      serviceId,
      addressId,
      input.date,
      `${input.time}:00`,
      input.notes || null,
      input.price,
      input.price,
      toDatabaseStatus(input.status) ?? 'confirmed',
    ],
  );
  const order = await findOrder(result.insertId);
  if (!order) throw new Error('Pesanan gagal dibaca setelah dibuat');
  return order;
}

export interface OrderActor {
  type: 'system' | 'customer' | 'admin' | 'cleaner';
  userId?: number | null;
  cleanerId?: number | null;
  notes?: string | null;
}

export async function updateBookingById(
  id: number,
  input: OrderWriteInput,
  actor: OrderActor = { type: 'system' },
): Promise<Order | null> {
  const status = toDatabaseStatus(input.status);
  if (input.status !== undefined && status === undefined)
    throw new Error('UNKNOWN_STATUS');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT status, customer_id AS customerId, address_id AS addressId,
         (hold_until > NOW()) AS onHold
       FROM bookings WHERE id = ? FOR UPDATE`,
      [id],
    );
    if (!rows[0]) {
      await connection.rollback();
      return null;
    }
    const current = rows[0].status as DatabaseOrderStatus;

    const fields: string[] = [];
    const values: (string | number)[] = [];
    if (input.date !== undefined) {
      fields.push('scheduled_date = ?');
      values.push(input.date);
    }
    if (input.time !== undefined) {
      fields.push('scheduled_start_time = ?');
      values.push(`${input.time}:00`);
    }
    if (input.notes !== undefined) {
      fields.push('customer_notes = ?');
      values.push(input.notes);
    }
    if (input.price !== undefined) {
      fields.push(
        'service_price = ?',
        'total_amount = ? + platform_fee - discount_amount',
      );
      values.push(input.price, input.price);
    }
    if (input.serviceName !== undefined) {
      fields.push('service_id = ?');
      values.push(await resolveServiceId(input.serviceName));
    }
    const changed = status !== undefined && status !== current;
    if (changed) {
      if (!canTransition(current, status)) {
        await connection.rollback();
        throw new OrderStatusTransitionError(current, status);
      }
      if (
        status !== undefined &&
        Number(rows[0].onHold) === 1 &&
        ['assigned', 'departed', 'en_route', 'in_progress', 'completed'].includes(
          status,
        )
      ) {
        await connection.rollback();
        throw new AppError(
          409,
          'Pesanan masih dalam masa tahan 15 detik.',
          'BOOKING_ON_HOLD',
        );
      }
      fields.push('status = ?');
      values.push(status);
    }
    const customerChanged =
      input.customerName !== undefined ||
      input.phone !== undefined ||
      input.address !== undefined;
    const staffChanged = input.staff !== undefined;
    if (!fields.length && !staffChanged && !customerChanged) {
      await connection.rollback();
      return findOrder(id);
    }

    if (fields.length) {
      values.push(id);
      await connection.execute(
        `UPDATE bookings SET ${fields.join(', ')} WHERE id = ?`,
        values,
      );
    }
    if (changed) {
      await connection.execute(
        `INSERT INTO booking_status_history
           (booking_id, status, actor_type, actor_user_id, actor_cleaner_id, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          status,
          actor.type,
          actor.userId ?? null,
          actor.cleanerId ?? null,
          actor.notes ?? null,
        ],
      );
    }
    if (input.customerName !== undefined) {
      await connection.execute('UPDATE users SET name = ? WHERE id = ?', [
        input.customerName,
        Number(rows[0].customerId),
      ]);
    }
    if (input.phone !== undefined) {
      await connection.execute(
        'UPDATE addresses SET recipient_phone = ? WHERE id = ?',
        [input.phone || null, Number(rows[0].addressId)],
      );
    }
    if (input.address !== undefined) {
      await connection.execute(
        'UPDATE addresses SET street_address = ? WHERE id = ?',
        [input.address, Number(rows[0].addressId)],
      );
    }
    if (staffChanged) {
      const names = [...new Set((input.staff ?? []).map((name) => name.trim()))]
        .filter(Boolean);
      if (names.length > MAX_STAFF_PER_ORDER) throw new Error('STAFF_LIMIT');
      if (names.length && !actor.userId) throw new Error('STAFF_ACTOR_REQUIRED');

      const [cleanerRows] = names.length
        ? await connection.query<RowDataPacket[]>(
            'SELECT id, name FROM cleaners WHERE is_active = TRUE AND name IN (?)',
            [names],
          )
        : [[] as RowDataPacket[]];
      if (cleanerRows.length !== names.length) throw new Error('STAFF_NOT_FOUND');

      const [assignedRows] = await connection.query<RowDataPacket[]>(
        'SELECT id, cleaner_id AS cleanerId FROM cleaner_assignments WHERE booking_id = ?',
        [id],
      );
      const desired = new Set(cleanerRows.map((row) => Number(row.id)));
      const removeIds = assignedRows
        .filter((row) => !desired.has(Number(row.cleanerId)))
        .map((row) => Number(row.id));
      if (removeIds.length)
        await connection.query(
          'DELETE FROM cleaner_assignments WHERE id IN (?)',
          [removeIds],
        );
      const existing = new Set(assignedRows.map((row) => Number(row.cleanerId)));
      for (const cleanerId of desired) {
        if (existing.has(cleanerId)) continue;
        await connection.execute(
          `INSERT INTO cleaner_assignments
             (booking_id, cleaner_id, assigned_by, link_token_hash, link_expires_at)
           VALUES (?, ?, ?, ?, ?)`,
          [
            id,
            cleanerId,
            Number(actor.userId),
            hashToken(createLinkToken()),
            linkExpiresAt(),
          ],
        );
      }
    }
    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // rollback after an explicit rollback is a no-op
    }
    throw error;
  } finally {
    connection.release();
  }
  return findOrder(id);
}

export type BookingDeleteResult = 'deleted' | 'not_found' | 'not_finished';

// Only finished orders may be removed. Active orders keep their history until
// they are completed or cancelled.
const DELETABLE_STATUSES = ['completed', 'cancelled'];

export async function deleteBookingById(id: number): Promise<BookingDeleteResult> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT status FROM bookings WHERE id = ? LIMIT 1',
      [id],
    );
    if (!rows[0]) {
      await connection.rollback();
      return 'not_found';
    }
    if (!DELETABLE_STATUSES.includes(String(rows[0].status))) {
      await connection.rollback();
      return 'not_finished';
    }

    // payments and reviews reference the booking without ON DELETE CASCADE.
    await connection.execute('DELETE FROM payments WHERE booking_id = ?', [id]);
    await connection.execute('DELETE FROM reviews WHERE booking_id = ?', [id]);
    await connection.execute('DELETE FROM bookings WHERE id = ?', [id]);

    await connection.commit();
    return 'deleted';
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

