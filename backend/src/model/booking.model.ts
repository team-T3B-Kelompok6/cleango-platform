import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';

export const BOOKING_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00'] as const;
export type BookingSlot = (typeof BOOKING_SLOTS)[number];

export const BOOKING_SLOT_MINUTES = 120;
export const BOOKING_MAX_DAYS_AHEAD = 30;
export const BOOKING_MIN_LEAD_MINUTES = 60;
export const PLATFORM_FEE = 5000;

const CAPACITY_SQL = `SELECT
   SUM(scheduled_start_time = '08:00:00') AS s0800,
   SUM(scheduled_start_time = '10:00:00') AS s1000,
   SUM(scheduled_start_time = '12:00:00') AS s1200,
   SUM(scheduled_start_time = '14:00:00') AS s1400,
   SUM(scheduled_start_time = '16:00:00') AS s1600
   FROM bookings
   WHERE scheduled_date = ?
     AND status NOT IN ('cancelled', 'rescheduled')`;

interface CapacityRow extends RowDataPacket {
  s0800: number | null;
  s1000: number | null;
  s1200: number | null;
  s1400: number | null;
  s1600: number | null;
}

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

export async function slotUsage(isoDate: string): Promise<Record<BookingSlot, number>> {
  const [rows] = await pool.execute<CapacityRow[]>(CAPACITY_SQL, [isoDate]);
  const row = rows[0];
  return {
    '08:00': Number(row?.s0800 ?? 0),
    '10:00': Number(row?.s1000 ?? 0),
    '12:00': Number(row?.s1200 ?? 0),
    '14:00': Number(row?.s1400 ?? 0),
    '16:00': Number(row?.s1600 ?? 0),
  };
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
}

export class BookingConflictError extends Error {
  constructor(public readonly reason: 'SLOT_FULL' | 'DUPLICATE' | 'BUSY') {
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
      'SELECT price FROM services WHERE id = ? AND is_active = TRUE LIMIT 1',
      [input.serviceId],
    );
    const serviceRow = serviceRows[0];
    if (!serviceRow) {
      await connection.rollback();
      throw new Error('SERVICE_NOT_BOOKABLE');
    }
    const price = Number(serviceRow.price);

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
         (booking_code, customer_id, service_id, address_id, scheduled_date,
          scheduled_start_time, customer_notes, service_price, platform_fee,
          discount_amount, total_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'confirmed')`,
      [
        code,
        input.customerId,
        input.serviceId,
        input.addressId,
        input.date,
        `${input.time}:00`,
        input.notes || null,
        price,
        PLATFORM_FEE,
        price + PLATFORM_FEE,
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

export async function findCustomerBooking(customerId: number, id: number) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT b.id, b.booking_code AS code,
       DATE_FORMAT(b.scheduled_date, '%Y-%m-%d') AS date,
       TIME_FORMAT(b.scheduled_start_time, '%H:%i') AS time,
       s.name AS service, b.service_price AS servicePrice,
       b.platform_fee AS platformFee, b.total_amount AS totalAmount,
       b.status, COALESCE(b.customer_notes, '') AS notes,
       a.label AS addressLabel, a.street_address AS address
     FROM bookings b
     INNER JOIN services s ON s.id = b.service_id
     INNER JOIN addresses a ON a.id = b.address_id
     WHERE b.id = ? AND b.customer_id = ?
     LIMIT 1`,
    [id, customerId],
  );
  return rows[0] ?? null;
}
