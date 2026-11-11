import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import 'dotenv/config';
import mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { randomBytes } from 'node:crypto';
import {
  addDays, cancelCustomerBooking, createBooking, findCustomerBooking,
  listCustomerBookings, rescheduleCustomerBooking,
} from '../src/model/booking.model.js';
import { assignCleaner } from '../src/model/cleaner-task.model.js';
import { updateBookingById } from '../src/model/order.model.js';

const enabled = process.env.DB_NAME === 'cleango' && process.env.RUN_DB_TESTS === '1';
const suite = enabled ? describe : describe.skip;

suite('customer changes before assignment (RUN_DB_TESTS=1)', () => {
  let db: mysql.Connection;
  let categoryId = 0;
  let serviceId = 0;
  let adminId = 0;
  let cleanerId = 0;
  const users: number[] = [];
  const addresses: number[] = [];
  const stamp = randomBytes(6).toString('hex');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  let date: string;
  const cleanerName = `Uji Reschedule ${stamp}`;

  async function addBooking(status = 'confirmed', customerIndex = 0, time = '08:00') {
    const [row] = await db.execute<ResultSetHeader>(
      `INSERT INTO bookings
         (booking_code, customer_id, service_id, address_id, scheduled_date,
          scheduled_start_time, scheduled_end_time, service_price, service_duration_minutes,
          platform_fee, discount_amount, total_amount, status, hold_until)
       VALUES (?, ?, ?, ?, ?, ?, ADDTIME(?, '01:30:00'), 100000, 90, 5000, 10000, 95000,
         ?, DATE_SUB(NOW(), INTERVAL 1 MINUTE))`,
      [`R${randomBytes(12).toString('hex')}`, users[customerIndex], serviceId,
        addresses[customerIndex], date, `${time}:00`, `${time}:00`, status],
    );
    return Number(row.insertId);
  }

  const assignment = (bookingId: number) => assignCleaner({
    bookingId, cleanerId, adminId, token: randomBytes(32).toString('hex'),
    expiresAt: new Date(Date.now() + 86_400_000),
  });

  async function cleanBookings() {
    if (!db || !users.length) return;
    await db.query('DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE customer_id IN (?))', [users]);
    await db.query('DELETE FROM bookings WHERE customer_id IN (?)', [users]);
  }

  beforeAll(async () => {
    db = await mysql.createConnection({
      host: process.env.DB_HOST, port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: 'cleango',
    });
    for (let offset = 30; offset > 0; offset -= 1) {
      const candidate = addDays(today, offset);
      const [rows] = await db.execute<RowDataPacket[]>(
        'SELECT id FROM bookings WHERE scheduled_date = ? LIMIT 1', [candidate],
      );
      if (!rows.length) { date = candidate; break; }
    }
    if (!date) throw new Error('No empty test date within booking window');
    const [category] = await db.execute<ResultSetHeader>(
      "INSERT INTO service_categories (name, resource) VALUES (?, 'services')", [`Uji ${stamp}`],
    );
    categoryId = Number(category.insertId);
    const [service] = await db.execute<ResultSetHeader>(
      `INSERT INTO services (category_id, name, slug, description, price, duration_minutes, is_active)
       VALUES (?, ?, ?, 'uji', 200000, 120, TRUE)`,
      [categoryId, `Uji ${stamp}`, `uji-${stamp}`],
    );
    serviceId = Number(service.insertId);
    for (let index = 0; index < 5; index += 1) {
      const [user] = await db.execute<ResultSetHeader>(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('uji-reschedule', ?, 'x', 'customer')",
        [`uji-${stamp}-${index}@test.local`],
      );
      users.push(Number(user.insertId));
      const [address] = await db.execute<ResultSetHeader>(
        `INSERT INTO addresses (user_id, label, recipient_name, recipient_phone, street_address, is_primary)
         VALUES (?, 'Uji', 'Uji', '081200000000', 'Jl. Uji', TRUE)`, [user.insertId],
      );
      addresses.push(Number(address.insertId));
    }
    const [admin] = await db.execute<ResultSetHeader>(
      "INSERT INTO users (name, email, password_hash, role) VALUES ('uji-admin', ?, 'x', 'admin')",
      [`uji-admin-${stamp}@test.local`],
    );
    adminId = Number(admin.insertId);
    const [cleaner] = await db.execute<ResultSetHeader>(
      "INSERT INTO cleaners (name, phone, status, is_active) VALUES (?, ?, 'available', TRUE)",
      [cleanerName, `uji-${stamp}`],
    );
    cleanerId = Number(cleaner.insertId);
  });

  afterEach(async () => {
    vi.useRealTimers();
    await cleanBookings();
  });

  afterAll(async () => {
    if (!db) return;
    try {
      await cleanBookings();
      if (cleanerId) await db.execute('DELETE FROM cleaners WHERE id = ?', [cleanerId]);
      if (serviceId) await db.execute('DELETE FROM services WHERE id = ?', [serviceId]);
      if (categoryId) await db.execute('DELETE FROM service_categories WHERE id = ?', [categoryId]);
      if (users.length) await db.query('DELETE FROM users WHERE id IN (?)', [users]);
      if (adminId) await db.execute('DELETE FROM users WHERE id = ?', [adminId]);
      const [remaining] = await db.execute<RowDataPacket[]>(
        'SELECT id FROM services WHERE id = ? UNION ALL SELECT id FROM cleaners WHERE id = ?', [serviceId, cleanerId],
      );
      expect(remaining).toHaveLength(0);
    } finally {
      await db.end();
    }
  });

  it.each(['confirmed', 'awaiting_payment'])('reschedules %s after expiry without financial or duration changes', async (status) => {
    const id = await addBooking(status);
    await db.execute("INSERT INTO payments (booking_id, method, amount, status) VALUES (?, 'qris', 95000, 'paid')", [id]);
    const before = await findCustomerBooking(users[0]!, id);
    expect(await rescheduleCustomerBooking(users[0]!, id, date, '09:00')).toEqual({ ok: true });
    expect(await findCustomerBooking(users[0]!, id)).toMatchObject({ date, time: '09:00', status,
      canCancel: true, canReschedule: true, serviceDurationMinutes: 90, servicePrice: 100000,
      platformFee: 5000, discountAmount: 10000, totalAmount: 95000, paymentStatus: 'paid', holdUntil: before?.holdUntil });
    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT TIME_FORMAT(scheduled_end_time, '%H:%i') AS endTime FROM bookings WHERE id = ?", [id],
    );
    expect(rows[0]?.endTime).toBe('10:30');
    expect((await listCustomerBookings(users[0]!)).find((row) => Number(row.id) === id))
      .toMatchObject({ canCancel: 1, canReschedule: 1 });
    expect(await rescheduleCustomerBooking(users[0]!, id, date, '09:00')).toEqual({ ok: true });
    expect(await rescheduleCustomerBooking(users[0]!, id, date, '10:00')).toEqual({ ok: true });
    expect(await cancelCustomerBooking(users[0]!, id)).toEqual({ ok: true });
    expect((await findCustomerBooking(users[0]!, id))?.paymentStatus).toBe('paid');
    const [history] = await db.execute<RowDataPacket[]>(
      "SELECT status, notes FROM booking_status_history WHERE booking_id = ? AND notes LIKE 'Jadwal diubah%'", [id],
    );
    expect(history).toHaveLength(2);
    expect(history[0]?.status).toBe(status);
  });

  it('hides other customer bookings and rejects all post-assignment statuses', async () => {
    const id = await addBooking();
    expect(await rescheduleCustomerBooking(users[1]!, id, date, '10:00')).toEqual({ ok: false, reason: 'NOT_FOUND' });
    expect(await cancelCustomerBooking(users[1]!, id)).toEqual({ ok: false, reason: 'NOT_FOUND' });
    for (const status of ['assigned', 'departed', 'en_route', 'in_progress', 'completed', 'cancelled', 'rescheduled']) {
      await db.execute('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
      expect(await rescheduleCustomerBooking(users[0]!, id, date, '10:00')).toEqual({ ok: false, reason: 'NOT_ALLOWED' });
      expect(await cancelCustomerBooking(users[0]!, id)).toEqual({ ok: false, reason: 'NOT_ALLOWED' });
      expect(await findCustomerBooking(users[0]!, id)).toMatchObject({ canCancel: false, canReschedule: false });
    }
  });

  it('rejects an assignment before its status has synchronized', async () => {
    const id = await addBooking();
    await assignment(id);
    expect(await rescheduleCustomerBooking(users[0]!, id, date, '10:00')).toEqual({ ok: false, reason: 'ALREADY_ASSIGNED' });
    expect(await cancelCustomerBooking(users[0]!, id)).toEqual({ ok: false, reason: 'ALREADY_ASSIGNED' });
    expect(await findCustomerBooking(users[0]!, id)).toMatchObject({ canCancel: false, canReschedule: false });
  });

  it('validates dates, slots, minimum lead time and service availability', async () => {
    const id = await addBooking();
    for (const [targetDate, time, reason] of [
      ['2026-02-30', '10:00', 'INVALID_DATE'], [addDays(today, -1), '10:00', 'PAST_DATE'],
      [addDays(today, 31), '10:00', 'TOO_FAR'], [date, '09:30', 'INVALID_SLOT'],
    ]) expect(await rescheduleCustomerBooking(users[0]!, id, targetDate!, time!)).toEqual({ ok: false, reason });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${today}T09:30:00+07:00`));
    expect(await rescheduleCustomerBooking(users[0]!, id, today, '10:00')).toEqual({ ok: false, reason: 'SLOT_CLOSED' });
    vi.useRealTimers();
    await db.execute('UPDATE services SET is_active = FALSE WHERE id = ?', [serviceId]);
    try {
      expect(await rescheduleCustomerBooking(users[0]!, id, date, '10:00')).toEqual({ ok: false, reason: 'SERVICE_INACTIVE' });
    } finally {
      await db.execute('UPDATE services SET is_active = TRUE WHERE id = ?', [serviceId]);
    }
    expect(await findCustomerBooking(users[0]!, id)).toMatchObject({ date, time: '08:00' });
  });

  it('rejects duplicate and full slots but excludes itself for an unchanged slot', async () => {
    const id = await addBooking();
    const duplicate = await addBooking('confirmed', 0, '11:00');
    expect(await rescheduleCustomerBooking(users[0]!, id, date, '11:00')).toEqual({ ok: false, reason: 'DUPLICATE' });
    await cancelCustomerBooking(users[0]!, duplicate);
    const full = await Promise.all([1, 2, 3].map((index) => addBooking('confirmed', index, '11:00')));
    expect(await rescheduleCustomerBooking(users[0]!, id, date, '11:00')).toEqual({ ok: false, reason: 'SLOT_FULL' });
    expect(await rescheduleCustomerBooking(users[1]!, full[0]!, date, '11:00')).toEqual({ ok: true });
    expect(await findCustomerBooking(users[0]!, id)).toMatchObject({ date, time: '08:00' });
  });

  it('shares slot capacity with concurrent creation and rescheduling', async () => {
    await Promise.all([1, 2].map((index) => addBooking('confirmed', index, '12:00')));
    const id = await addBooking();
    const results = await Promise.allSettled([
      rescheduleCustomerBooking(users[0]!, id, date, '12:00'),
      createBooking({ customerId: users[3]!, serviceId, addressId: addresses[3]!, date, time: '12:00', notes: '' }),
    ]);
    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT id FROM bookings WHERE scheduled_date = ? AND scheduled_start_time = '12:00:00' AND status NOT IN ('cancelled', 'rescheduled')", [date],
    );
    expect(rows).toHaveLength(3);
    expect(results.filter((result) => result.status === 'fulfilled' && ('id' in result.value || result.value.ok))).toHaveLength(1);
  });

  it('serializes concurrent reschedules for the final capacity place', async () => {
    await Promise.all([2, 3].map((index) => addBooking('confirmed', index, '12:00')));
    const first = await addBooking('confirmed', 0);
    const second = await addBooking('awaiting_payment', 1);
    const results = await Promise.all([
      rescheduleCustomerBooking(users[0]!, first, date, '12:00'),
      rescheduleCustomerBooking(users[1]!, second, date, '12:00'),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok && result.reason === 'SLOT_FULL')).toHaveLength(1);
  });

  it('serializes customer cancellation against reschedule', async () => {
    const id = await addBooking();
    const [cancelled] = await Promise.all([
      cancelCustomerBooking(users[0]!, id),
      rescheduleCustomerBooking(users[0]!, id, date, '14:00'),
    ]);
    expect(cancelled).toEqual({ ok: true });
    expect(await findCustomerBooking(users[0]!, id)).toMatchObject({ status: 'cancelled', canCancel: false, canReschedule: false });
  });

  it('serializes reschedule against assignment and admin cancellation', async () => {
    const id = await addBooking();
    const [result] = await Promise.all([rescheduleCustomerBooking(users[0]!, id, date, '13:00'), assignment(id)]);
    expect(result.ok || (!result.ok && result.reason === 'ALREADY_ASSIGNED')).toBe(true);
    expect(await findCustomerBooking(users[0]!, id)).toMatchObject({ canCancel: false, canReschedule: false });
    const other = await addBooking();
    await Promise.all([
      rescheduleCustomerBooking(users[0]!, other, date, '14:00'),
      updateBookingById(other, { status: 'Batal' }, { type: 'admin', userId: adminId }),
    ]);
    expect(await findCustomerBooking(users[0]!, other)).toMatchObject({ status: 'cancelled', canCancel: false, canReschedule: false });
  });

  it('never assigns a booking cancelled concurrently by its customer', async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const id = await addBooking();
      const results = await Promise.allSettled([cancelCustomerBooking(users[0]!, id), assignment(id)]);
      const booking = await findCustomerBooking(users[0]!, id);
      const [rows] = await db.execute<RowDataPacket[]>('SELECT id FROM cleaner_assignments WHERE booking_id = ?', [id]);
      if (booking?.status === 'cancelled') expect(rows).toHaveLength(0);
      else expect(rows).toHaveLength(1);
      expect(results[0]?.status).toBe('fulfilled');
      await db.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [id]);
    }
    const id = await addBooking();
    await cancelCustomerBooking(users[0]!, id);
    await expect(assignment(id)).rejects.toMatchObject({ code: 'ASSIGNMENT_NOT_ALLOWED' });
    await expect(updateBookingById(id, { staff: [cleanerName] }, { type: 'admin', userId: adminId }))
      .rejects.toMatchObject({ code: 'ASSIGNMENT_NOT_ALLOWED' });
  });

  it('preserves the admin hold guard after a customer reschedule', async () => {
    const id = await addBooking();
    await db.execute('UPDATE bookings SET hold_until = DATE_ADD(NOW(), INTERVAL 15 SECOND) WHERE id = ?', [id]);
    const before = await findCustomerBooking(users[0]!, id);
    expect(await rescheduleCustomerBooking(users[0]!, id, date, '10:00')).toEqual({ ok: true });
    expect((await findCustomerBooking(users[0]!, id))?.holdUntil).toEqual(before?.holdUntil);
    await expect(assignment(id)).rejects.toMatchObject({ code: 'BOOKING_ON_HOLD' });
    await expect(updateBookingById(id, { staff: [cleanerName] }, { type: 'admin', userId: adminId }))
      .rejects.toMatchObject({ code: 'BOOKING_ON_HOLD' });
  });
});
