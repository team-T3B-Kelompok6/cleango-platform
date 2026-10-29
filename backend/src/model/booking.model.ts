import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { addressSql } from '../lib/address-display.js';
import { pool } from '../lib/db.js';

// Hourly slots so customers have more choice; matches the mobile selector.
export const BOOKING_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
] as const;
export type BookingSlot = (typeof BOOKING_SLOTS)[number];

export const BOOKING_MAX_DAYS_AHEAD = 30;
export const BOOKING_MIN_LEAD_MINUTES = 60;
export const PLATFORM_FEE = 5000;

const CAPACITY_PER_SLOT = 3;

export interface SlotAvailability {
  time: BookingSlot;
  available: boolean;
  reason?: string;
}

export function isValidSlot(value: unknown): value is BookingSlot {
  return typeof value === 'string' && (BOOKING_SLOTS as readonly string[]).includes(value);
}

function jakartaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

function jakartaNowMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d! + days));
  return date.toISOString().slice(0, 10);
}

export interface DateIssue {
  code: 'INVALID_DATE' | 'PAST_DATE' | 'TOO_FAR';
  message: string;
}

export function validateBookingDate(isoDate: string): DateIssue | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate))
    return { code: 'INVALID_DATE', message: 'Tanggal tidak valid.' };
  const [y, m, d] = isoDate.split('-').map(Number);
  const parsed = new Date(Date.UTC(y!, m! - 1, d!));
  if (
    parsed.getUTCFullYear() !== y ||
    parsed.getUTCMonth() !== m! - 1 ||
    parsed.getUTCDate() !== d
  )
    return { code: 'INVALID_DATE', message: 'Tanggal tidak valid.' };

  const today = jakartaToday();
  if (isoDate < today)
    return { code: 'PAST_DATE', message: 'Tanggal sudah lewat.' };
  if (isoDate > addDays(today, BOOKING_MAX_DAYS_AHEAD))
    return {
      code: 'TOO_FAR',
      message: `Tanggal maksimal ${BOOKING_MAX_DAYS_AHEAD} hari ke depan.`,
    };
  return null;
}

export function slotStartMinutes(slot: BookingSlot): number {
  const [h, m] = slot.split(':').map(Number);
  return h! * 60 + m!;
}

// A same-day slot is closed once the lead time has passed.
export function isSlotLeadTimePassed(isoDate: string, slot: BookingSlot): boolean {
  if (isoDate !== jakartaToday()) return false;
  return jakartaNowMinutes() + BOOKING_MIN_LEAD_MINUTES > slotStartMinutes(slot);
}

export async function slotUsage(
  isoDate: string,
): Promise<Record<BookingSlot, number>> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT TIME_FORMAT(scheduled_start_time, '%H:%i') AS slot, COUNT(*) AS total
     FROM bookings
     WHERE scheduled_date = ? AND status NOT IN ('cancelled', 'rescheduled')
     GROUP BY slot`,
    [isoDate],
  );
  const usage = Object.fromEntries(
    BOOKING_SLOTS.map((slot) => [slot, 0]),
  ) as Record<BookingSlot, number>;
  for (const row of rows) {
    const slot = String(row.slot);
    if (slot in usage) usage[slot as BookingSlot] = Number(row.total ?? 0);
  }
  return usage;
}

export async function listAvailability(
  isoDate: string,
  serviceId?: number | null,
): Promise<{
  date: string;
  slots: SlotAvailability[];
  serviceActive: boolean | null;
}> {
  const usage = await slotUsage(isoDate);
  let serviceActive: boolean | null = null;
  if (serviceId) serviceActive = await isServiceActive(serviceId);

  const slots = BOOKING_SLOTS.map((time) => {
    if (serviceId && serviceActive === false)
      return { time, available: false, reason: 'Layanan sedang tidak tersedia.' };
    if (isSlotLeadTimePassed(isoDate, time))
      return { time, available: false, reason: 'Waktu pemesanan sudah lewat.' };
    if (usage[time] >= CAPACITY_PER_SLOT)
      return { time, available: false, reason: 'Slot sudah penuh.' };
    return { time, available: true };
  });
  return { date: isoDate, slots, serviceActive };
}

export async function isServiceActive(serviceId: number): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT is_active FROM services WHERE id = ? LIMIT 1',
    [serviceId],
  );
  return rows[0] ? Boolean(rows[0].is_active) : false;
}

export interface ServiceBookingFacts {
  id: number;
  name: string;
  price: number;
  active: boolean;
}

export async function findBookableService(
  serviceId: number,
): Promise<ServiceBookingFacts | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, name, price, is_active FROM services WHERE id = ? LIMIT 1',
    [serviceId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    name: String(row.name),
    price: Number(row.price),
    active: Boolean(row.is_active),
  };
}

export async function findOwnedAddress(
  customerId: number,
  addressId: number,
): Promise<{ id: number; label: string } | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, label FROM addresses WHERE id = ? AND user_id = ? LIMIT 1',
    [addressId, customerId],
  );
  const row = rows[0];
  return row ? { id: Number(row.id), label: String(row.label) } : null;
}

export async function findPrimaryAddressId(customerId: number): Promise<number | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM addresses WHERE user_id = ? ORDER BY is_primary DESC, id ASC LIMIT 1',
    [customerId],
  );
  return rows[0] ? Number(rows[0].id) : null;
}

function bookingCode(): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CG-${Date.now().toString(36).toUpperCase()}${random}`;
}

export interface CreateBookingInput {
  customerId: number;
  serviceId: number;
  addressId: number;
  date: string;
  time: BookingSlot;
  notes: string;
  promo?: { id: number; discountAmount: number; perCustomerLimit: number } | null;
}

export class BookingConflictError extends Error {
  constructor(
    public readonly reason: 'SLOT_FULL' | 'DUPLICATE' | 'BUSY' | 'PROMO_LIMIT',
  ) {
    super(reason);
  }
}

// Deadlock / lock-wait are expected under concurrent submissions; they map to
// the same "try a different slot" conflict answer instead of a 500.
function isLockConflict(error: unknown): boolean {
  const errno = (error as { errno?: number })?.errno;
  return errno === 1213 || errno === 1205;
}

// Slot capacity and duplicate requests are checked inside one transaction so two
// concurrent submissions cannot both pass the availability check.
export async function createBooking(input: CreateBookingInput): Promise<{
  id: number;
  code: string;
}> {
  const lockName = `cleango_slot_${input.date}_${input.time}`;
  const connection = await pool.getConnection();
  let locked = false;
  try {
    const [lockRows] = await connection.execute<RowDataPacket[]>(
      'SELECT GET_LOCK(?, 5) AS ok',
      [lockName],
    );
    if (Number(lockRows[0]?.ok ?? 0) !== 1) throw new BookingConflictError('BUSY');
    locked = true;

    await connection.beginTransaction();

    const [existing] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM bookings
       WHERE customer_id = ? AND scheduled_date = ? AND scheduled_start_time = ?
         AND status NOT IN ('cancelled', 'rescheduled')`,
      [input.customerId, input.date, `${input.time}:00`],
    );
    if (existing.length > 0) {
      await connection.rollback();
      throw new BookingConflictError('DUPLICATE');
    }

    const [countRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM bookings
       WHERE scheduled_date = ? AND scheduled_start_time = ?
         AND status NOT IN ('cancelled', 'rescheduled')`,
      [input.date, `${input.time}:00`],
    );
    if (Number(countRows[0]?.total ?? 0) >= CAPACITY_PER_SLOT) {
      await connection.rollback();
      throw new BookingConflictError('SLOT_FULL');
    }

    const [serviceRows] = await connection.execute<RowDataPacket[]>(
      'SELECT price, duration_minutes FROM services WHERE id = ? AND is_active = TRUE LIMIT 1',
      [input.serviceId],
    );
    const serviceRow = serviceRows[0];
    if (!serviceRow) {
      await connection.rollback();
      throw new Error('SERVICE_NOT_BOOKABLE');
    }
    const price = Number(serviceRow.price);
    const durationMinutes = Number(serviceRow.duration_minutes);
    const discount = Math.min(
      Math.max(0, Math.round(input.promo?.discountAmount ?? 0)),
      price,
    );

    if (input.promo) {
      const [usageRows] = await connection.execute<RowDataPacket[]>(
        'SELECT COUNT(*) AS total FROM promo_usages WHERE promo_id = ? AND user_id = ?',
        [input.promo.id, input.customerId],
      );
      if (Number(usageRows[0]?.total ?? 0) >= input.promo.perCustomerLimit) {
        await connection.rollback();
        throw new BookingConflictError('PROMO_LIMIT');
      }
    }

    const [addressRows] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM addresses WHERE id = ? AND user_id = ? LIMIT 1',
      [input.addressId, input.customerId],
    );
    if (!addressRows[0]) {
      await connection.rollback();
      throw new Error('ADDRESS_NOT_OWNED');
    }

    const code = bookingCode();
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO bookings
         (booking_code, customer_id, service_id, address_id, promo_id, scheduled_date,
          scheduled_start_time, customer_notes, service_price, service_duration_minutes,
          platform_fee, discount_amount, total_amount, status, hold_until)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed',
         DATE_ADD(NOW(), INTERVAL 15 SECOND))`,
      [
        code,
        input.customerId,
        input.serviceId,
        input.addressId,
        input.promo?.id ?? null,
        input.date,
        `${input.time}:00`,
        input.notes || null,
        price,
        durationMinutes,
        PLATFORM_FEE,
        discount,
        price + PLATFORM_FEE - discount,
      ],
    );

    if (input.promo) {
      await connection.execute(
        `INSERT INTO promo_usages (promo_id, booking_id, user_id, discount_amount)
         VALUES (?, ?, ?, ?)`,
        [input.promo.id, result.insertId, input.customerId, discount],
      );
      await connection.execute(
        'UPDATE promos SET used_count = used_count + 1 WHERE id = ?',
        [input.promo.id],
      );
    }

    await connection.execute(
      `INSERT INTO notifications (recipient_user_id, booking_id, type, title, message)
       VALUES (?, ?, 'order', 'Pesanan Dikonfirmasi', ?)`,
      [
        input.customerId,
        result.insertId,
        `Pesanan ${code} untuk ${input.date} pukul ${input.time} telah dibuat dan menunggu penugasan cleaner.`,
      ],
    );

    await connection.commit();
    return { id: Number(result.insertId), code };
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // rollback after an explicit rollback is a no-op
    }
    if (isLockConflict(error)) throw new BookingConflictError('BUSY');
    throw error;
  } finally {
    if (locked) {
      try {
        await connection.execute('SELECT RELEASE_LOCK(?)', [lockName]);
      } catch {
        // the lock is released with the connection anyway
      }
    }
    connection.release();
  }
}

export type CancelBookingFailure =
  | 'NOT_FOUND'
  | 'NOT_ALLOWED'
  | 'WINDOW_CLOSED'
  | 'ALREADY_ASSIGNED';

export async function cancelCustomerBooking(
  customerId: number,
  bookingId: number,
): Promise<{ ok: true } | { ok: false; reason: CancelBookingFailure }> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT b.status, b.hold_until AS holdUntil,
         (b.hold_until > NOW()) AS holdActive,
         ca.id AS assignmentId
       FROM bookings b
       LEFT JOIN cleaner_assignments ca ON ca.booking_id = b.id
       WHERE b.id = ? AND b.customer_id = ?
       FOR UPDATE`,
      [bookingId, customerId],
    );
    const row = rows[0];
    if (!row) {
      await connection.rollback();
      return { ok: false, reason: 'NOT_FOUND' };
    }
    if (row.status !== 'confirmed') {
      await connection.rollback();
      return { ok: false, reason: 'NOT_ALLOWED' };
    }
    if (row.assignmentId !== null) {
      await connection.rollback();
      return { ok: false, reason: 'ALREADY_ASSIGNED' };
    }
    if (Number(row.holdActive) !== 1) {
      await connection.rollback();
      return { ok: false, reason: 'WINDOW_CLOSED' };
    }
    await connection.execute(
      `UPDATE bookings
       SET status = 'cancelled',
           cancellation_reason = 'Dibatalkan customer dalam masa tahan 15 detik.'
       WHERE id = ?`,
      [bookingId],
    );
    await connection.execute(
      `INSERT INTO booking_status_history
         (booking_id, status, actor_type, actor_user_id, notes)
       VALUES (?, 'cancelled', 'customer', ?, 'Dibatalkan dalam masa tahan 15 detik.')`,
      [bookingId, customerId],
    );
    await connection.commit();
    return { ok: true };
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
}

export async function findCustomerBooking(customerId: number, id: number) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT b.id, b.booking_code AS code,
       DATE_FORMAT(b.scheduled_date, '%Y-%m-%d') AS date,
       TIME_FORMAT(b.scheduled_start_time, '%H:%i') AS time,
       s.name AS service, b.service_price AS servicePrice,
       COALESCE(b.service_duration_minutes, s.duration_minutes) AS serviceDurationMinutes,
       b.platform_fee AS platformFee, b.discount_amount AS discountAmount,
       b.total_amount AS totalAmount, p.code AS promoCode,
       pay.status AS paymentStatus,
       b.status, b.hold_until AS holdUntil,
       (b.status = 'confirmed' AND b.hold_until > NOW() AND ca.id IS NULL) AS canCancel,
       COALESCE(b.customer_notes, '') AS notes,
       r.id IS NOT NULL AS hasReview,
       r.rating AS reviewRating, r.comment AS reviewComment,
       (b.completed_at IS NOT NULL AND b.completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS reviewEditable,
       (SELECT GROUP_CONCAT(rp.id ORDER BY rp.sort_order SEPARATOR ',')
        FROM review_photos rp WHERE rp.review_id = r.id) AS reviewPhotoIds,
       (SELECT GROUP_CONCAT(rp.photo_url ORDER BY rp.sort_order SEPARATOR ',')
        FROM review_photos rp WHERE rp.review_id = r.id) AS reviewPhotos,
       a.label AS addressLabel, a.landmark,
       COALESCE(NULLIF(a.recipient_name, ''), u.name) AS recipientName,
       COALESCE(NULLIF(a.recipient_phone, ''), u.phone) AS recipientPhone,
       cl.name AS cleanerName, ${addressSql('a')} AS address
     FROM bookings b
     INNER JOIN services s ON s.id = b.service_id
     INNER JOIN addresses a ON a.id = b.address_id
     INNER JOIN users u ON u.id = b.customer_id
     LEFT JOIN cleaner_assignments ca ON ca.booking_id = b.id
     LEFT JOIN cleaners cl ON cl.id = ca.cleaner_id
     LEFT JOIN promos p ON p.id = b.promo_id
     LEFT JOIN payments pay ON pay.booking_id = b.id
     LEFT JOIN reviews r ON r.booking_id = b.id
     WHERE b.id = ? AND b.customer_id = ?
     LIMIT 1`,
    [id, customerId],
  );
  return rows[0] ?? null;
}

export interface CustomerBookingRow extends RowDataPacket {
  id: number;
  code: string;
  date: string;
  time: string;
  service: string;
  serviceDurationMinutes: number;
  startedAt: Date | number | null;
  servicePrice: number;
  platformFee: number;
  discountAmount: number;
  totalAmount: number;
  databaseStatus: string;
  holdUntil: Date | null;
  canCancel: number;
  notes: string;
  reviewPhotoIds: string | null;
  reviewPhotos: string | null;
  addressLabel: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

// Only the signed-in customer's own bookings are returned.
export async function listCustomerBookings(
  customerId: number,
): Promise<CustomerBookingRow[]> {
  const [rows] = await pool.execute<CustomerBookingRow[]>(
    `SELECT b.id, b.booking_code AS code,
       DATE_FORMAT(b.scheduled_date, '%Y-%m-%d') AS date,
       TIME_FORMAT(b.scheduled_start_time, '%H:%i') AS time,
       s.name AS service,
       COALESCE(b.service_duration_minutes, s.duration_minutes) AS serviceDurationMinutes,
       UNIX_TIMESTAMP(bs.started_at) * 1000 AS startedAt, b.service_price AS servicePrice,
       b.platform_fee AS platformFee, b.discount_amount AS discountAmount,
       b.total_amount AS totalAmount, b.status AS databaseStatus,
       pay.status AS paymentStatus,
       b.hold_until AS holdUntil,
       (b.status = 'confirmed' AND b.hold_until > NOW() AND ca.id IS NULL) AS canCancel,
       COALESCE(b.customer_notes, '') AS notes,
       r.id IS NOT NULL AS hasReview,
       r.rating AS reviewRating, r.comment AS reviewComment,
       (b.completed_at IS NOT NULL AND b.completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS reviewEditable,
       (SELECT GROUP_CONCAT(rp.id ORDER BY rp.sort_order SEPARATOR ',')
        FROM review_photos rp WHERE rp.review_id = r.id) AS reviewPhotoIds,
       (SELECT GROUP_CONCAT(rp.photo_url ORDER BY rp.sort_order SEPARATOR ',')
        FROM review_photos rp WHERE rp.review_id = r.id) AS reviewPhotos,
       a.label AS addressLabel,
       a.landmark,
       COALESCE(NULLIF(a.recipient_name, ''), u.name) AS recipientName,
       COALESCE(NULLIF(a.recipient_phone, ''), u.phone) AS recipientPhone,
       cl.name AS cleanerName,
       ${addressSql('a')} AS address,
       a.latitude, a.longitude
     FROM bookings b
     INNER JOIN services s ON s.id = b.service_id
     INNER JOIN addresses a ON a.id = b.address_id
     INNER JOIN users u ON u.id = b.customer_id
     LEFT JOIN cleaner_assignments ca ON ca.booking_id = b.id
     LEFT JOIN cleaners cl ON cl.id = ca.cleaner_id
     LEFT JOIN cleaner_task_stages bs ON bs.assignment_id = ca.id
     LEFT JOIN payments pay ON pay.booking_id = b.id
     LEFT JOIN reviews r ON r.booking_id = b.id
     WHERE b.customer_id = ?
     ORDER BY b.scheduled_date DESC, b.scheduled_start_time DESC, b.id DESC`,
    [customerId],
  );
  return rows;
}

/**
 * The mobile app ships catalog slugs while the backend keys services by id.
 * Accept either so booking works for both clients.
 */
export async function resolveBookableServiceId(
  identifier: string,
): Promise<number | null> {
  const value = identifier.trim();
  if (!value) return null;
  const numeric = Number(value);
  const [rows] = Number.isInteger(numeric) && numeric > 0
    ? await pool.execute<RowDataPacket[]>(
        'SELECT id FROM services WHERE id = ? AND is_active = TRUE LIMIT 1',
        [numeric],
      )
    : await pool.execute<RowDataPacket[]>(
        'SELECT id FROM services WHERE slug = ? AND is_active = TRUE LIMIT 1',
        [value],
      );
  return rows[0] ? Number(rows[0].id) : null;
}
