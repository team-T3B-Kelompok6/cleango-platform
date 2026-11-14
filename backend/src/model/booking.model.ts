import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { Pool, PoolConnection } from 'mysql2/promise';
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

// One lock serializes capacity writes across start slots and midnight boundaries.
// ponytail: single MySQL server; all capacity-increasing writers must use this lock.
const CAPACITY_LOCK = 'cleango_booking_capacity';

export async function acquireCapacityLock(connection: PoolConnection): Promise<boolean> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    'SELECT GET_LOCK(?, 5) AS ok', [CAPACITY_LOCK],
  );
  return Number(rows[0]?.ok ?? 0) === 1;
}

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

export async function expireExpiredAwaitingBookings(
  db: Pool | PoolConnection = pool,
): Promise<number> {
  const [expired] = await db.execute<RowDataPacket[]>(
    `SELECT id, promo_id FROM bookings
     WHERE status = 'awaiting_payment' AND hold_until IS NOT NULL AND hold_until <= NOW()`,
  );
  if (!expired || expired.length === 0) return 0;

  const ids = expired.map((b) => Number(b.id));
  await db.query(
    "UPDATE bookings SET status = 'cancelled', cancellation_reason = 'Batas waktu pembayaran habis.' WHERE id IN (?) AND status = 'awaiting_payment'",
    [ids],
  );
  await db.query(
    "UPDATE payments SET status = 'expired' WHERE booking_id IN (?) AND status = 'pending'",
    [ids],
  );
  await db.query(
    "UPDATE promo_usages SET status = 'released' WHERE booking_id IN (?) AND status = 'reserved'",
    [ids],
  );

  for (const row of expired) {
    if (row.promo_id) {
      await db.execute(
        `UPDATE promos SET used_count = GREATEST(0, used_count - 1) WHERE id = ?`,
        [row.promo_id],
      );
    }
  }

  return ids.length;
}

// Expired holds no longer consume capacity or block duplicate bookings.
export async function capacityBoard(
  db: Pool | PoolConnection,
  date: string,
  duration: number,
  excludeId = 0,
) {
  const [staff] = await db.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM cleaners WHERE is_active = TRUE',
  );
  const [bookings] = await db.execute<RowDataPacket[]>(
    `SELECT TIMESTAMPDIFF(MINUTE, TIMESTAMP(?),
        TIMESTAMP(scheduled_date, scheduled_start_time)) AS start,
        service_duration_minutes AS duration
     FROM bookings
     WHERE status NOT IN ('cancelled', 'rescheduled') AND id <> ?
       AND TIMESTAMP(scheduled_date, scheduled_start_time) < TIMESTAMPADD(MINUTE, ?, TIMESTAMP(?))
       AND TIMESTAMPADD(MINUTE, service_duration_minutes,
         TIMESTAMP(scheduled_date, scheduled_start_time)) > TIMESTAMP(?)`,
    [date, excludeId, slotStartMinutes('16:00') + duration, date, date],
  );
  const usage = Object.fromEntries(BOOKING_SLOTS.map((time) => {
    const start = slotStartMinutes(time);
    const end = start + duration;
    const events: [number, number][] = [];
    for (const booking of bookings) {
      const busyStart = Number(booking.start);
      const busyEnd = busyStart + Number(booking.duration);
      if (busyStart < end && busyEnd > start)
        events.push([Math.max(start, busyStart), 1], [Math.min(end, busyEnd), -1]);
    }
    // Half-open intervals: finishing exactly at another start is not an overlap.
    events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let current = 0;
    let peak = 0;
    for (const [, delta] of events) peak = Math.max(peak, current += delta);
    return [time, peak];
  })) as Record<BookingSlot, number>;
  return { usage, capacity: Number(staff[0]?.total ?? 0) };
}

export async function listAvailability(
  isoDate: string,
  serviceId?: number | null,
  customerId?: number,
): Promise<{
  date: string;
  slots: SlotAvailability[];
  serviceActive: boolean | null;
}> {
  let serviceActive: boolean | null = null;
  let duration = 60;
  if (serviceId) {
    const [services] = await pool.execute<RowDataPacket[]>(
      'SELECT is_active, duration_minutes FROM services WHERE id = ? LIMIT 1', [serviceId],
    );
    serviceActive = Boolean(services[0]?.is_active);
    duration = Number(services[0]?.duration_minutes ?? 60);
  }
  const { usage, capacity } = await capacityBoard(pool, isoDate, duration);
  const duplicates = new Set<string>();
  if (customerId && serviceId) {
    const [bookings] = await pool.execute<RowDataPacket[]>(
      `SELECT TIME_FORMAT(scheduled_start_time, '%H:%i') AS slot FROM bookings
       WHERE customer_id = ? AND service_id = ? AND scheduled_date = ?
         AND status NOT IN ('cancelled', 'rescheduled')`,
      [customerId, serviceId, isoDate],
    );
    for (const booking of bookings) duplicates.add(String(booking.slot));
  }

  const slots = BOOKING_SLOTS.map((time) => {
    if (serviceId && serviceActive === false)
      return { time, available: false, reason: 'Layanan sedang tidak tersedia.' };
    if (isSlotLeadTimePassed(isoDate, time))
      return { time, available: false, reason: 'Waktu pemesanan sudah lewat.' };
    if (duplicates.has(time))
      return { time, available: false, reason: 'Anda sudah memesan layanan pada slot ini.' };
    if (usage[time] >= capacity)
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

export async function releaseCapacityConnection(connection: PoolConnection, locked: boolean) {
  if (locked) {
    try {
      await connection.execute('SELECT RELEASE_LOCK(?)', [CAPACITY_LOCK]);
    } catch {
      // Returning a still-locked session to the pool would leak the advisory lock.
      connection.destroy();
      return;
    }
  }
  connection.release();
}

// Slot capacity and duplicate requests are checked inside one transaction so two
// concurrent submissions cannot both pass the availability check.
export async function createBooking(input: CreateBookingInput): Promise<{
  id: number;
  code: string;
  reused?: boolean;
}> {
  // One lock also covers durations that cross midnight and different start slots.
  const connection = await pool.getConnection();
  let locked = false;
  try {
    if (!(await acquireCapacityLock(connection))) throw new BookingConflictError('BUSY');
    locked = true;

    await connection.beginTransaction();

    await expireExpiredAwaitingBookings(connection);

    const [existing] = await connection.execute<RowDataPacket[]>(
      `SELECT id, booking_code AS code, status, address_id AS addressId,
          COALESCE(customer_notes, '') AS notes, promo_id AS promoId FROM bookings
       WHERE customer_id = ? AND service_id = ? AND scheduled_date = ? AND scheduled_start_time = ?
         AND status NOT IN ('cancelled', 'rescheduled')`,
      [input.customerId, input.serviceId, input.date, `${input.time}:00`],
    );
    if (existing.length > 0) {
      const match = existing[0];
      const sameBooking =
        match &&
        match.status === 'awaiting_payment' &&
        Number(match.addressId) === input.addressId &&
        String(match.notes ?? '').trim() === (input.notes || '').trim() &&
        (match.promoId === null ? null : Number(match.promoId)) ===
          (input.promo?.id ?? null);
      if (sameBooking) {
        await connection.commit();
        return { id: Number(match.id), code: String(match.code), reused: true };
      }
      await connection.rollback();
      throw new BookingConflictError('DUPLICATE');
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
    const { usage, capacity } = await capacityBoard(connection, input.date, durationMinutes);
    if (usage[input.time] >= capacity) throw new BookingConflictError('SLOT_FULL');
    const discount = Math.min(
      Math.max(0, Math.round(input.promo?.discountAmount ?? 0)),
      price,
    );

    if (input.promo) {
      const [usageRows] = await connection.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM promo_usages
         WHERE promo_id = ? AND user_id = ? AND status IN ('reserved', 'redeemed')`,
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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_payment',
         DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
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
       VALUES (?, ?, 'order', 'Menunggu Pembayaran', ?)`,
      [
        input.customerId,
        result.insertId,
        `Pesanan ${code} untuk ${input.date} pukul ${input.time} sedang menunggu pembayaran. Selesaikan pembayaran sebelum batas waktu agar pesanan dapat dikonfirmasi.`,
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
    await releaseCapacityConnection(connection, locked);
  }
}

export type CancelBookingFailure =
  | 'NOT_FOUND'
  | 'NOT_ALLOWED'
  | 'ALREADY_ASSIGNED';

export async function cancelCustomerBooking(
  customerId: number,
  bookingId: number,
): Promise<{ ok: true } | { ok: false; reason: CancelBookingFailure }> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT b.status, b.promo_id AS promoId, ca.id AS assignmentId
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
    if (row.status !== 'confirmed' && row.status !== 'awaiting_payment') {
      await connection.rollback();
      return { ok: false, reason: 'NOT_ALLOWED' };
    }
    if (row.assignmentId !== null) {
      await connection.rollback();
      return { ok: false, reason: 'ALREADY_ASSIGNED' };
    }
    if (row.promoId !== null) {
      await connection.execute(
        `UPDATE promos SET used_count = GREATEST(0, used_count - 1) WHERE id = ?`,
        [row.promoId],
      );
      await connection.execute(
        `UPDATE promo_usages SET status = 'released' WHERE promo_id = ? AND booking_id = ?`,
        [row.promoId, bookingId],
      );
    }
    await connection.execute(
      `UPDATE bookings
       SET status = 'cancelled',
           cancellation_reason = 'Dibatalkan customer.'
       WHERE id = ?`,
      [bookingId],
    );
    await connection.execute(
      `INSERT INTO booking_status_history
         (booking_id, status, actor_type, actor_user_id, notes)
       VALUES (?, 'cancelled', 'customer', ?, 'Dibatalkan customer.')`,
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

export type RescheduleBookingFailure =
  | CancelBookingFailure
  | 'SLOT_FULL'
  | 'DUPLICATE'
  | 'BUSY'
  | 'SERVICE_INACTIVE'
  | 'INVALID_DATE'
  | 'PAST_DATE'
  | 'TOO_FAR'
  | 'INVALID_SLOT'
  | 'SLOT_CLOSED';

export async function rescheduleCustomerBooking(
  customerId: number,
  bookingId: number,
  date: string,
  time: string,
): Promise<{ ok: true } | { ok: false; reason: RescheduleBookingFailure }> {
  const issue = validateBookingDate(date);
  if (issue) return { ok: false, reason: issue.code };
  if (!isValidSlot(time)) return { ok: false, reason: 'INVALID_SLOT' };
  const connection = await pool.getConnection();
  let locked = false;
  try {
    if (!(await acquireCapacityLock(connection))) return { ok: false, reason: 'BUSY' };
    locked = true;
    await connection.beginTransaction();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT b.status, b.service_id AS serviceId, b.service_duration_minutes AS duration,
         DATE_FORMAT(b.scheduled_date, '%Y-%m-%d') AS date,
         TIME_FORMAT(b.scheduled_start_time, '%H:%i') AS time,
         ca.id AS assignmentId
       FROM bookings b
       LEFT JOIN cleaner_assignments ca ON ca.booking_id = b.id
       WHERE b.id = ? AND b.customer_id = ? FOR UPDATE`,
      [bookingId, customerId],
    );
    const row = rows[0];
    let reason: RescheduleBookingFailure | undefined;
    if (!row) reason = 'NOT_FOUND';
    else if (row.status !== 'confirmed' && row.status !== 'awaiting_payment') reason = 'NOT_ALLOWED';
    else if (row.assignmentId !== null) reason = 'ALREADY_ASSIGNED';
    else if (validateBookingDate(date)) reason = validateBookingDate(date)!.code;
    else if (isSlotLeadTimePassed(date, time)) reason = 'SLOT_CLOSED';
    if (reason) {
      await connection.rollback();
      return { ok: false, reason };
    }
    const [services] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM services WHERE id = ? AND is_active = TRUE LIMIT 1', [row!.serviceId],
    );
    if (!services[0]) {
      await connection.rollback();
      return { ok: false, reason: 'SERVICE_INACTIVE' };
    }
    if (row!.date === date && row!.time === time) {
      await connection.commit();
      return { ok: true };
    }
    const [existing] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM bookings
       WHERE customer_id = ? AND service_id = ? AND scheduled_date = ? AND scheduled_start_time = ?
         AND status NOT IN ('cancelled', 'rescheduled') AND id <> ?`,
      [customerId, row!.serviceId, date, `${time}:00`, bookingId],
    );
    if (existing.length > 0) reason = 'DUPLICATE';
    if (!reason) {
      const { usage, capacity } = await capacityBoard(connection, date, Number(row!.duration), bookingId);
      if (usage[time] >= capacity) reason = 'SLOT_FULL';
    }
    if (reason) {
      await connection.rollback();
      return { ok: false, reason };
    }
    await connection.execute(
      `UPDATE bookings SET scheduled_date = ?, scheduled_start_time = ?,
         scheduled_end_time = CASE WHEN scheduled_end_time IS NULL THEN NULL
           ELSE ADDTIME(?, SEC_TO_TIME(service_duration_minutes * 60)) END
       WHERE id = ?`,
      [date, `${time}:00`, `${time}:00`, bookingId],
    );
    await connection.execute(
      `INSERT INTO booking_status_history (booking_id, status, actor_type, actor_user_id, notes)
       VALUES (?, ?, 'customer', ?, ?)`,
      [bookingId, row!.status, customerId,
        `Jadwal diubah dari ${row!.date} ${row!.time} ke ${date} ${time}.`],
    );
    await connection.commit();
    return { ok: true };
  } catch (error) {
    await connection.rollback();
    if (isLockConflict(error)) return { ok: false, reason: 'BUSY' };
    throw error;
  } finally {
    await releaseCapacityConnection(connection, locked);
  }
}

export async function findCustomerBooking(customerId: number, id: number) {
  const [rows] = await pool.execute<(RowDataPacket & {
    paymentStatus: string | null;
    paymentMethod: string | null;
  })[]>(
    `SELECT b.id, b.booking_code AS code,
       DATE_FORMAT(b.scheduled_date, '%Y-%m-%d') AS date,
       TIME_FORMAT(b.scheduled_start_time, '%H:%i') AS time,
       s.name AS service, b.service_price AS servicePrice,
       COALESCE(b.service_duration_minutes, s.duration_minutes) AS serviceDurationMinutes,
       b.platform_fee AS platformFee, b.discount_amount AS discountAmount,
       b.total_amount AS totalAmount, p.code AS promoCode,
       pay.status AS paymentStatus, pay.method AS paymentMethod,
       (SELECT ps.checkout_url FROM payment_sessions ps
        WHERE ps.booking_id = b.id AND ps.reference_id = pay.gateway_reference
          AND ps.reference_id LIKE 'mid-%' AND ps.status = 'active'
          AND ps.session_id IS NOT NULL AND ps.amount = b.total_amount
          AND pay.status = 'pending' AND pay.method <> 'cash'
          AND b.status NOT IN ('cancelled', 'completed')
          AND NOT EXISTS (SELECT 1 FROM payment_sessions legacy
            WHERE legacy.booking_id = b.id AND legacy.reference_id NOT LIKE 'mid-%'
              AND legacy.status IN ('active', 'creating', 'unknown', 'completed'))
        ORDER BY ps.id DESC LIMIT 1) AS checkoutUrl,
       b.status, b.hold_until - INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND AS holdUntil,
       (b.status IN ('confirmed', 'awaiting_payment') AND ca.id IS NULL) AS canCancel,
       (b.status IN ('confirmed', 'awaiting_payment') AND ca.id IS NULL) AS canReschedule,
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
       cl.name AS cleanerName, CASE WHEN cl.id IS NULL THEN NULL ELSE
          (SELECT COUNT(DISTINCT completed.id) FROM bookings completed
           INNER JOIN cleaner_assignments assigned ON assigned.booking_id = completed.id
           WHERE assigned.cleaner_id = cl.id AND completed.status = 'completed')
        END AS cleanerCompletedBookings, ${addressSql('a')} AS address
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
  const row = rows[0];
  return row ? { ...row, canCancel: Boolean(row.canCancel), canReschedule: Boolean(row.canReschedule) } : null;
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
  paymentStatus: string | null;
  paymentMethod: string | null;
  checkoutUrl: string | null;
  holdUntil: Date | null;
  canCancel: number;
  canReschedule: number;
  notes: string;
  reviewPhotoIds: string | null;
  reviewPhotos: string | null;
  addressLabel: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  cleanerName: string | null;
  cleanerCompletedBookings: number | string | null;
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
       pay.status AS paymentStatus, pay.method AS paymentMethod,
       (SELECT ps.checkout_url FROM payment_sessions ps
        WHERE ps.booking_id = b.id AND ps.reference_id = pay.gateway_reference
          AND ps.reference_id LIKE 'mid-%' AND ps.status = 'active'
          AND ps.session_id IS NOT NULL AND ps.amount = b.total_amount
          AND pay.status = 'pending' AND pay.method <> 'cash'
          AND b.status NOT IN ('cancelled', 'completed')
          AND NOT EXISTS (SELECT 1 FROM payment_sessions legacy
            WHERE legacy.booking_id = b.id AND legacy.reference_id NOT LIKE 'mid-%'
              AND legacy.status IN ('active', 'creating', 'unknown', 'completed'))
        ORDER BY ps.id DESC LIMIT 1) AS checkoutUrl,
       b.hold_until - INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND AS holdUntil,
       (b.status IN ('confirmed', 'awaiting_payment') AND ca.id IS NULL) AS canCancel,
       (b.status IN ('confirmed', 'awaiting_payment') AND ca.id IS NULL) AS canReschedule,
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
       CASE WHEN cl.id IS NULL THEN NULL ELSE
          (SELECT COUNT(DISTINCT completed.id) FROM bookings completed
           INNER JOIN cleaner_assignments assigned ON assigned.booking_id = completed.id
           WHERE assigned.cleaner_id = cl.id AND completed.status = 'completed')
        END AS cleanerCompletedBookings,
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
       AND (b.status != 'awaiting_payment' OR b.hold_until IS NULL OR b.hold_until > NOW())
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