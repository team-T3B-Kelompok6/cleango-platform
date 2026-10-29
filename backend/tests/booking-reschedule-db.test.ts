import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import 'dotenv/config';
import mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { randomBytes } from 'node:crypto';
import {
  addDays,
  cancelCustomerBooking,
  createBooking,
  findCustomerBooking,
  rescheduleCustomerBooking,
} from '../src/model/booking.model.js';
import { assignCleaner } from '../src/model/cleaner-task.model.js';
import { updateBookingById } from '../src/model/order.model.js';

const enabled = process.env.DB_NAME === 'cleango' && process.env.RUN_DB_TESTS === '1';
const suite = enabled ? describe : describe.skip;

suite('customer reschedule (RUN_DB_TESTS=1)', () => {
  let db: mysql.Connection;
  let customerId = 0;
  let secondCustomerId = 0;
  let adminId = 0;
  let cleanerId = 0;
  let serviceId = 0;
  let addressId = 0;
  let secondAddressId = 0;
  const bookings: number[] = [];
  const stamp = randomBytes(6).toString('hex');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const date = addDays(today, 1);
  const secondDate = addDays(today, 2);

  beforeAll(async () => {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'cleango',
    });

    const [customer] = await db.execute<ResultSetHeader>(
      "INSERT INTO users (name, email, password_hash, role, is_active) VALUES ('uji-res-cust', ?, 'x', 'customer', TRUE)",
      [`uji-res-cust-${stamp}@test.local`],
    );
    customerId = Number(customer.insertId);

    const [customer2] = await db.execute<ResultSetHeader>(
      "INSERT INTO users (name, email, password_hash, role, is_active) VALUES ('uji-res-cust2', ?, 'x', 'customer', TRUE)",
      [`uji-res-cust2-${stamp}@test.local`],
    );
    secondCustomerId = Number(customer2.insertId);

    const [admin] = await db.execute<ResultSetHeader>(
      "INSERT INTO users (name, email, password_hash, role, is_active) VALUES ('uji-res-admin', ?, 'x', 'admin', TRUE)",
      [`uji-res-admin-${stamp}@test.local`],
    );
    adminId = Number(admin.insertId);

    const [category] = await db.query<RowDataPacket[]>('SELECT id FROM service_categories ORDER BY id LIMIT 1');
    if (!category[0]) throw new Error('Kategori layanan tidak tersedia');

    const [service] = await db.execute<ResultSetHeader>(
      `INSERT INTO services (category_id, name, slug, description, price, duration_minutes, is_active)
       VALUES (?, ?, ?, 'uji', 150000, 90, TRUE)`,
      [Number(category[0].id), `Uji Reschedule ${stamp}`, `uji-res-${stamp}`],
    );
    serviceId = Number(service.insertId);

    const [address1] = await db.execute<ResultSetHeader>(
      `INSERT INTO addresses (user_id, label, recipient_name, recipient_phone, street_address, city, is_primary)
       VALUES (?, 'Rumah', 'Uji', '081200000001', 'Jl. Reschedule 1', 'Malang', TRUE)`,
      [customerId],
    );
    addressId = Number(address1.insertId);

    const [address2] = await db.execute<ResultSetHeader>(
      `INSERT INTO addresses (user_id, label, recipient_name, recipient_phone, street_address, city, is_primary)
       VALUES (?, 'Kantor', 'Uji', '081200000002', 'Jl. Reschedule 2', 'Malang', TRUE)`,
      [secondCustomerId],
    );
    secondAddressId = Number(address2.insertId);

    const [cleaner] = await db.execute<ResultSetHeader>(
      `INSERT INTO cleaners (name, phone, status, is_active) VALUES ('Uji Reschedule Cleaner', ?, 'available', TRUE)`,
      [`uji-${stamp}`],
    );
    cleanerId = Number(cleaner.insertId);
  });

  afterAll(async () => {
    if (!db) return;
    try {
      if (bookings.length) {
        await db.query('DELETE FROM cleaner_assignments WHERE booking_id IN (?)', [bookings]);
        await db.query('DELETE FROM booking_status_history WHERE booking_id IN (?)', [bookings]);
        await db.query('DELETE FROM bookings WHERE id IN (?)', [bookings]);
      }
      if (addressId) await db.execute('DELETE FROM addresses WHERE id = ?', [addressId]);
      if (secondAddressId) await db.execute('DELETE FROM addresses WHERE id = ?', [secondAddressId]);
      if (serviceId) await db.execute('DELETE FROM services WHERE id = ?', [serviceId]);
      if (cleanerId) await db.execute('DELETE FROM cleaners WHERE id = ?', [cleanerId]);
      if (customerId || secondCustomerId || adminId)
        await db.query('DELETE FROM users WHERE id IN (?)', [[customerId, secondCustomerId, adminId]]);
    } finally {
      await db.end();
    }
  });

  const createTestBooking = async (status: 'confirmed' | 'awaiting_payment', custId = customerId, addrId = addressId): Promise<number> => {
    const [row] = await db.execute<ResultSetHeader>(
      `INSERT INTO bookings
         (booking_code, customer_id, service_id, address_id, scheduled_date,
          scheduled_start_time, scheduled_end_time, service_price, service_duration_minutes,
          platform_fee, discount_amount, total_amount, status, hold_until)
       VALUES (?, ?, ?, ?, ?, '09:00:00', ADDTIME('09:00:00', '01:30:00'), 150000, 90,
         5000, 0, 145000, ?, NULL)`,
      [`RB${stamp}${bookings.length}`, custId, serviceId, addrId, date],
    );
    const id = Number(row.insertId);
    bookings.push(id);
    await db.execute(
      `INSERT INTO booking_status_history (booking_id, status, actor_type, actor_user_id)
       VALUES (?, ?, 'customer', ?)`,
      [id, status, custId],
    );
    return id;
  };

  async function assignBooking(bookingId: number, cleanerIdNum = cleanerId, adminIdNum = adminId) {
    const [row] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM bookings WHERE id = ? FOR UPDATE', [bookingId],
    );
    if (!row[0]) return false;
    await db.query(
      'INSERT INTO cleaner_assignments (booking_id, cleaner_id, assigned_by, link_token_hash, link_expires_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))',
      [bookingId, cleanerIdNum, adminIdNum, randomBytes(32).toString('hex')],
    );
    return true;
  }

  it('reschedules a confirmed booking to a different date', async () => {
    const id = await createTestBooking('confirmed');
    const result = await rescheduleCustomerBooking(customerId, id, secondDate, '10:00');
    expect(result).toEqual({ ok: true });
    const booking = await findCustomerBooking(customerId, id);
    expect(booking).toMatchObject({ date: secondDate, time: '10:00', status: 'confirmed' });
    expect(booking?.canCancel).toBe(true);
    expect(booking?.canReschedule).toBe(true);
    await cancelCustomerBooking(customerId, id);
  });

  it('reschedules an awaiting_payment booking', async () => {
    const id = await createTestBooking('awaiting_payment');
    const result = await rescheduleCustomerBooking(customerId, id, secondDate, '11:00');
    expect(result).toEqual({ ok: true });
    const booking = await findCustomerBooking(customerId, id);
    expect(booking?.canReschedule).toBe(true);
  });

  it('rejects reschedule for NOT_FOUND booking', async () => {
    const result = await rescheduleCustomerBooking(customerId, 99999, date, '10:00');
    expect(result).toEqual({ ok: false, reason: 'NOT_FOUND' });
  });

  it('rejects reschedule for cancelled booking', async () => {
    const id = await createTestBooking('cancelled');
    await cancelCustomerBooking(customerId, id);
    const result = await rescheduleCustomerBooking(customerId, id, secondDate, '10:00');
    expect(result).toEqual({ ok: false, reason: 'NOT_ALLOWED' });
  });

  it('rejects reschedule for completed booking', async () => {
    const id = await createTestBooking('confirmed');
    await updateBookingById(id, { status: 'Selesai' }, { type: 'system' });
    const result = await rescheduleCustomerBooking(customerId, id, secondDate, '10:00');
    expect(result).toEqual({ ok: false, reason: 'NOT_ALLOWED' });
  });

  it('rejects reschedule when cleaner is assigned', async () => {
    const id = await createTestBooking('confirmed');
    await assignBooking(id);
    const result = await rescheduleCustomerBooking(customerId, id, secondDate, '10:00');
    expect(result).toEqual({ ok: false, reason: 'ALREADY_ASSIGNED' });
  });
});