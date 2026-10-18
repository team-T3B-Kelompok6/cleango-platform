import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';

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
  service: string;
  price: number;
  date: string;
  time: string;
  staffNames: string;
  databaseStatus: DatabaseOrderStatus;
  notes: string;
}

export interface Order {
  id: string;
  customerId: string;
  customer: string;
  address: string;
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
}

const orderSelect = `SELECT b.id, b.customer_id AS customerId,
  u.name AS customer,
  CONCAT_WS(', ', a.street_address, a.city, a.province) AS address,
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
  COALESCE(b.customer_notes, '') AS notes
  FROM bookings b
  INNER JOIN users u ON u.id = b.customer_id
  INNER JOIN addresses a ON a.id = b.address_id
  INNER JOIN services s ON s.id = b.service_id`;

function apiStatus(status: DatabaseOrderStatus): Order['status'] {
  if (status === 'in_progress') return 'Sedang Dikerjakan';
  if (status === 'completed') return 'Selesai';
  if (status === 'cancelled') return 'Batal';
  if (status === 'en_route' || status === 'departed') return 'Menuju Lokasi';
  if (status === 'assigned') return 'Menunggu Lokasi';
  return 'Menunggu Assign';
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
    service: row.service,
    price: row.price,
    date: row.date,
    time: row.time,
    staff: row.staffNames ? row.staffNames.split('|||') : [],
    status: apiStatus(row.databaseStatus),
    notes: row.notes,
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

export async function updateBookingById(
  id: number,
  input: OrderWriteInput,
): Promise<Order | null> {
  const existing = await findOrder(id);
  if (!existing) return null;
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
    fields.push('service_price = ?', 'total_amount = ?');
    values.push(input.price, input.price);
  }
  if (input.serviceName !== undefined) {
    fields.push('service_id = ?');
    values.push(await resolveServiceId(input.serviceName));
  }
  const status = toDatabaseStatus(input.status);
  if (status !== undefined) {
    fields.push('status = ?');
    values.push(status);
  }
  if (!fields.length) return existing;

  values.push(id);
  await pool.execute(`UPDATE bookings SET ${fields.join(', ')} WHERE id = ?`, values);
  return findOrder(id);
}

export async function deleteBookingById(id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    "DELETE FROM bookings WHERE id = ? AND status IN ('confirmed', 'assigned', 'cancelled')",
    [id],
  );
  return result.affectedRows > 0;
}

