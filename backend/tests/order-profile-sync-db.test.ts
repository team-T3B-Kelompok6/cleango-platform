import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

const enabled = process.env.DB_NAME === 'cleango' && process.env.RUN_DB_TESTS === '1';
const suite = enabled ? describe : describe.skip;

suite('order profile sync and cash settlement (RUN_DB_TESTS=1)', () => {
  let db: mysql.Connection;
  let customer = 0;
  let admin = 0;
  let cleaner = 0;
  let serviceId = 0;
  let addressId = 0;
  const bookings: number[] = [];

  beforeAll(async () => {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'cleango',
    });
    const stamp = Date.now();
    const [u] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ('Nama Lama', ?, '081100000000', 'x', 'customer')`,
      [`uji-sync-${stamp}@test.local`],
    );
    customer = Number(u.insertId);
    const [a] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, password_hash, role) VALUES ('uji-sync-admin', ?, 'x', 'admin')`,
      [`uji-sync-admin-${stamp}@test.local`],
    );
    admin = Number(a.insertId);
    const [c] = await db.execute<ResultSetHeader>(
      `INSERT INTO cleaners (name, phone, area, status, average_rating, is_active)
       VALUES (?, ?, 'Uji', 'available', 0, TRUE)`,
      [`Uji Sync Cleaner ${stamp}`, '081200000088'],
    );
    cleaner = Number(c.insertId);
    const [addr] = await db.execute<ResultSetHeader>(
      `INSERT INTO addresses (user_id, label, recipient_name, recipient_phone, street_address, landmark, is_primary)
       VALUES (?, 'Kantor', 'Penerima Lama', '081122223333', 'Jl. Lama 1', 'Patokan lama', TRUE)`,
      [customer],
    );
    addressId = Number(addr.insertId);
    const [s] = await db.execute<ResultSetHeader>(
      `INSERT INTO services (category_id, name, slug, description, price, duration_minutes, is_active)
       VALUES (5, ?, ?, 'uji', 100000, 60, TRUE)`,
      [`Uji Sync ${stamp}`, `uji-sync-${stamp}`],
    );
    serviceId = Number(s.insertId);
    for (const [index, status] of ['assigned', 'in_progress'].entries()) {
      const [b] = await db.execute<ResultSetHeader>(
        `INSERT INTO bookings (booking_code, customer_id, service_id, address_id,
           scheduled_date, scheduled_start_time, service_price, service_duration_minutes,
           platform_fee, discount_amount, total_amount, status)
         VALUES (?, ?, ?, ?, '2026-12-24', '09:00:00', 100000, 60, 5000, 0, 105000, ?)`,
        [`US${stamp}${index}`, customer, serviceId, addressId, status],
      );
      bookings.push(Number(b.insertId));
    }
    await db.execute(
      `INSERT INTO cleaner_assignments
         (booking_id, cleaner_id, assigned_by, link_token_hash, link_expires_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))`,
      [bookings[0], cleaner, admin, randomBytes(32).toString('hex')],
    );
  });

  afterAll(async () => {
    if (db && bookings.length) {
      await db.query('DELETE FROM notifications WHERE booking_id IN (?)', [bookings]);
      await db.query('DELETE FROM payments WHERE booking_id IN (?)', [bookings]);
      await db.query('DELETE FROM booking_status_history WHERE booking_id IN (?)', [bookings]);
      await db.query('DELETE FROM cleaner_assignments WHERE booking_id IN (?)', [bookings]);
      await db.query('DELETE FROM bookings WHERE id IN (?)', [bookings]);
      await db.execute('DELETE FROM cleaners WHERE id = ?', [cleaner]);
      await db.execute('DELETE FROM services WHERE id = ?', [serviceId]);
      await db.execute('DELETE FROM addresses WHERE user_id = ?', [customer]);
      await db.query('DELETE FROM users WHERE id IN (?)', [[customer, admin]]);
      await db.end();
    }
  });

  it('persists the order name, phone and address without touching account name phones', async () => {
    const { updateBookingById, findOrder } = await import('../src/model/order.model.js');
    await updateBookingById(
      bookings[0],
      {
        customerName: 'Timoty',
        phone: '082140636747',
        address: 'Jl. Baru No. 2',
      },
      { type: 'admin', userId: admin },
    );
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT u.name AS accountName, u.phone AS accountPhone,
         a.recipient_name AS recipientName, a.recipient_phone AS recipientPhone,
         a.street_address AS street
       FROM bookings b
       INNER JOIN users u ON u.id = b.customer_id
       INNER JOIN addresses a ON a.id = b.address_id
       WHERE b.id = ?`,
      [bookings[0]],
    );
    expect(rows[0]?.accountName).toBe('Timoty');
    expect(rows[0]?.accountPhone).toBe('081100000000');
    expect(rows[0]?.recipientName).toBe('Penerima Lama');
    expect(rows[0]?.recipientPhone).toBe('082140636747');
    expect(rows[0]?.street).toBe('Jl. Baru No. 2');
    expect((await findOrder(bookings[0]))?.customer).toBe('Timoty');
  });

  it('returns cleaner, recipient and landmark for the customer card', async () => {
    const { findCustomerBooking } = await import('../src/model/booking.model.js');
    const booking = await findCustomerBooking(customer, bookings[0]);
    expect(booking?.cleanerName).toMatch(/^Uji Sync Cleaner/);
    expect(booking?.recipientName).toBe('Penerima Lama');
    expect(booking?.recipientPhone).toBe('082140636747');
    expect(booking?.landmark).toBe('Patokan lama');
  });

  it('settles cash when the cleaner finishes but leaves QRIS pending', async () => {
    const { syncBookingStatus } = await import('../src/model/cleaner-task.model.js');
    await db.execute(
      `INSERT INTO payments (booking_id, method, amount, status)
       VALUES (?, 'cash', 105000, 'pending')`,
      [bookings[0]],
    );
    await db.execute(
      `INSERT INTO payments (booking_id, method, amount, status)
       VALUES (?, 'qris', 105000, 'pending')`,
      [bookings[1]],
    );
    await syncBookingStatus(bookings[0], 'completed', { type: 'cleaner', cleanerId: cleaner });
    await syncBookingStatus(bookings[1], 'completed', { type: 'cleaner', cleanerId: cleaner });

    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT booking_id AS id, method, status, paid_at AS paidAt FROM payments WHERE booking_id IN (?)',
      [bookings],
    );
    const cash = rows.find((row) => Number(row.id) === bookings[0]);
    const qris = rows.find((row) => Number(row.id) === bookings[1]);
    expect(cash?.status).toBe('paid');
    expect(cash?.paidAt).not.toBeNull();
    expect(qris?.status).toBe('pending');
  });
});
