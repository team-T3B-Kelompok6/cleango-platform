import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import 'dotenv/config';
import mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { randomBytes } from 'node:crypto';

const enabled = process.env.DB_NAME === 'cleango' && process.env.RUN_DB_TESTS === '1';
const suite = enabled ? describe : describe.skip;

suite('booking hold and cancellation against the database (RUN_DB_TESTS=1)', () => {
  let db: mysql.Connection;
  let customerId = 0;
  let adminId = 0;
  let cleanerId = 0;
  let serviceId = 0;
  let addressId = 0;
  let holdFuture = 0;
  let holdPast = 0;
  let assignedHold = 0;
  let assignGuard = 0;
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
    const [customer] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ('uji-hold-customer', ?, 'x', 'customer', TRUE)`,
      [`uji-hold-customer-${stamp}@test.local`],
    );
    customerId = Number(customer.insertId);
    const [admin] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ('uji-hold-admin', ?, 'x', 'admin', TRUE)`,
      [`uji-hold-admin-${stamp}@test.local`],
    );
    adminId = Number(admin.insertId);
    const [address] = await db.execute<ResultSetHeader>(
      `INSERT INTO addresses
         (user_id, label, recipient_name, recipient_phone, street_address, city, province, is_primary)
       VALUES (?, 'Uji', 'Uji', '081200000000', 'Jl. Hold', 'Malang', 'Jawa Timur', TRUE)`,
      [customerId],
    );
    addressId = Number(address.insertId);
    const [category] = await db.query<RowDataPacket[]>(
      'SELECT id FROM service_categories ORDER BY id LIMIT 1',
    );
    if (!category[0]) throw new Error('Kategori layanan tidak tersedia');
    const [service] = await db.execute<ResultSetHeader>(
      `INSERT INTO services
         (category_id, name, slug, description, price, duration_minutes, is_active)
       VALUES (?, ?, ?, 'uji', 100000, 60, TRUE)`,
      [Number(category[0].id), `Uji Hold ${stamp}`, `uji-hold-${stamp}`],
    );
    serviceId = Number(service.insertId);
    const [cleaner] = await db.execute<ResultSetHeader>(
      `INSERT INTO cleaners (name, phone, area, status, average_rating, is_active)
       VALUES ('Uji Hold Cleaner', '081200000088', 'Malang', 'available', 0, TRUE)`,
    );
    cleanerId = Number(cleaner.insertId);

    async function addBooking(
      suffix: string,
      holdSql: string,
      date: string,
    ): Promise<number> {
      const [row] = await db.execute<ResultSetHeader>(
        `INSERT INTO bookings
           (booking_code, customer_id, service_id, address_id, scheduled_date,
            scheduled_start_time, service_price, service_duration_minutes,
            platform_fee, discount_amount, total_amount, status, hold_until)
         VALUES (?, ?, ?, ?, ?, '09:00:00', 100000, 60, 5000, 0, 105000,
           'confirmed', ${holdSql})`,
        [`H${suffix}${stamp}`, customerId, serviceId, addressId, date],
      );
      bookings.push(Number(row.insertId));
      return Number(row.insertId);
    }

    holdFuture = await addBooking('F', 'DATE_ADD(NOW(), INTERVAL 10 SECOND)', '2026-12-20');
    holdPast = await addBooking('P', 'DATE_SUB(NOW(), INTERVAL 1 SECOND)', '2026-12-21');
    assignedHold = await addBooking('A', 'DATE_ADD(NOW(), INTERVAL 10 SECOND)', '2026-12-22');
    assignGuard = await addBooking('G', 'DATE_ADD(NOW(), INTERVAL 10 SECOND)', '2026-12-23');
    await db.execute(
      `INSERT INTO cleaner_assignments
         (booking_id, cleaner_id, assigned_by, link_token_hash, link_expires_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))`,
      [assignedHold, cleanerId, adminId, randomBytes(32).toString('hex')],
    );
  });

  afterAll(async () => {
    if (db) {
      if (bookings.length) {
        await db.query('DELETE FROM cleaner_assignments WHERE booking_id IN (?)', [bookings]);
        await db.query('DELETE FROM booking_status_history WHERE booking_id IN (?)', [bookings]);
        await db.query('DELETE FROM bookings WHERE id IN (?)', [bookings]);
      }
      if (addressId) await db.execute('DELETE FROM addresses WHERE id = ?', [addressId]);
      if (serviceId) await db.execute('DELETE FROM services WHERE id = ?', [serviceId]);
      if (cleanerId) await db.execute('DELETE FROM cleaners WHERE id = ?', [cleanerId]);
      if (customerId || adminId)
        await db.query('DELETE FROM users WHERE id IN (?)', [[customerId, adminId]]);
      await db.end();
    }
  });

  it('cancels a booking during the 15 second hold and records history', async () => {
    const { cancelCustomerBooking } = await import('../src/model/booking.model.js');
    expect(await cancelCustomerBooking(customerId, holdFuture)).toEqual({ ok: true });
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT status, cancellation_reason AS reason FROM bookings WHERE id = ?',
      [holdFuture],
    );
    expect(rows[0]?.status).toBe('cancelled');
    expect(String(rows[0]?.reason)).toContain('15 detik');
    const [history] = await db.query<RowDataPacket[]>(
      "SELECT status, actor_type AS actorType FROM booking_status_history WHERE booking_id = ? ORDER BY id DESC LIMIT 1",
      [holdFuture],
    );
    expect(history[0]).toMatchObject({ status: 'cancelled', actorType: 'customer' });
  });

  it('rejects cancellation after the hold and when a cleaner is assigned', async () => {
    const { cancelCustomerBooking } = await import('../src/model/booking.model.js');
    expect(await cancelCustomerBooking(customerId, holdPast)).toEqual({
      ok: false,
      reason: 'WINDOW_CLOSED',
    });
    expect(await cancelCustomerBooking(customerId, assignedHold)).toEqual({
      ok: false,
      reason: 'ALREADY_ASSIGNED',
    });
  });

  it('blocks admin assignment while the booking is held', async () => {
    const { assignCleaner } = await import('../src/model/cleaner-task.model.js');
    await expect(
      assignCleaner({
        bookingId: assignGuard,
        cleanerId,
        adminId,
        token: 'hold-guard-token',
        expiresAt: new Date(Date.now() + 86_400_000),
      }),
    ).rejects.toMatchObject({ code: 'BOOKING_ON_HOLD' });

    const { updateBookingById } = await import('../src/model/order.model.js');
    await expect(
      updateBookingById(
        assignGuard,
        { status: 'Menunggu Lokasi' },
        { type: 'admin', userId: adminId },
      ),
    ).rejects.toMatchObject({ code: 'BOOKING_ON_HOLD' });
  });
});
