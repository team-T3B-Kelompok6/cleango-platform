import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import 'dotenv/config';
import mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

const enabled = process.env.DB_NAME === 'cleango' && process.env.RUN_DB_TESTS === '1';
const suite = enabled ? describe : describe.skip;

suite('booking status history and stale updates (RUN_DB_TESTS=1)', () => {
  let db: mysql.Connection;
  let userId = 0;
  let adminId = 0;
  let serviceId = 0;
  let addressId = 0;
  let bookingId = 0;

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
      `INSERT INTO users (name, email, password_hash, role) VALUES ('uji-status', ?, 'x', 'customer')`,
      [`uji-status-${stamp}@test.local`],
    );
    userId = Number(u.insertId);
    const [a] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, password_hash, role) VALUES ('uji-status-admin', ?, 'x', 'admin')`,
      [`uji-status-admin-${stamp}@test.local`],
    );
    adminId = Number(a.insertId);
    const [ad] = await db.execute<ResultSetHeader>(
      `INSERT INTO addresses (user_id, label, recipient_name, recipient_phone, street_address, is_primary)
       VALUES (?, 'Uji', 'Uji', '081200000000', 'Jl. Uji 1', TRUE)`,
      [userId],
    );
    addressId = Number(ad.insertId);
    const [s] = await db.execute<ResultSetHeader>(
      `INSERT INTO services (category_id, name, slug, description, price, duration_minutes, is_active)
       VALUES (5, ?, ?, 'uji', 100000, 60, TRUE)`,
      [`Uji Status ${stamp}`, `uji-status-${stamp}`],
    );
    serviceId = Number(s.insertId);
    const [b] = await db.execute<ResultSetHeader>(
      `INSERT INTO bookings (booking_code, customer_id, service_id, address_id,
         scheduled_date, scheduled_start_time, service_price, service_duration_minutes,
         platform_fee, discount_amount, total_amount, status)
       VALUES (?, ?, ?, ?, '2026-12-05', '09:00:00', 100000, 60, 5000, 0, 105000, 'confirmed')`,
      [`UJI${stamp}`, userId, serviceId, addressId],
    );
    bookingId = Number(b.insertId);
  });

  afterAll(async () => {
    if (db && bookingId) {
      await db.execute('DELETE FROM booking_status_history WHERE booking_id = ?', [bookingId]);
      await db.execute('DELETE FROM payments WHERE booking_id = ?', [bookingId]);
      await db.execute('DELETE FROM bookings WHERE id = ?', [bookingId]);
      await db.execute('DELETE FROM services WHERE id = ?', [serviceId]);
      await db.execute('DELETE FROM addresses WHERE user_id = ?', [userId]);
      await db.execute('DELETE FROM users WHERE id IN (?, ?)', [userId, adminId]);
      await db.end();
    }
  });

  const history = async () => {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT status FROM booking_status_history WHERE booking_id = ? ORDER BY id',
      [bookingId],
    );
    return rows.map((row) => row.status);
  };

  it('records an admin transition once and ignores a repeated status', async () => {
    const { updateBookingById } = await import('../src/model/order.model.js');
    await updateBookingById(
      bookingId,
      { status: 'Menunggu Lokasi' },
      { type: 'admin', userId: adminId },
    );
    await updateBookingById(
      bookingId,
      { status: 'Menunggu Lokasi' },
      { type: 'admin', userId: adminId },
    );
    expect(await history()).toEqual(['assigned']);
  });

  it('rejects a transition back to an earlier stage', async () => {
    const { updateBookingById } = await import('../src/model/order.model.js');
    const { OrderStatusTransitionError } = await import('../src/lib/order-status.js');
    await updateBookingById(
      bookingId,
      { status: 'Sedang Dikerjakan' },
      { type: 'admin', userId: adminId },
    );
    await expect(
      updateBookingById(
        bookingId,
        { status: 'Menunggu Lokasi' },
        { type: 'admin', userId: adminId },
      ),
    ).rejects.toBeInstanceOf(OrderStatusTransitionError);
    expect(await history()).toEqual(['assigned', 'in_progress']);
  });

  it('keeps a finished booking when a late cleaner event arrives', async () => {
    const { updateBookingById } = await import('../src/model/order.model.js');
    const { syncBookingStatus } = await import('../src/model/cleaner-task.model.js');
    await updateBookingById(
      bookingId,
      { status: 'Selesai' },
      { type: 'admin', userId: adminId },
    );
    await syncBookingStatus(bookingId, 'en_route', { type: 'cleaner', cleanerId: null });
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT status FROM bookings WHERE id = ?',
      [bookingId],
    );
    expect(rows[0]?.status).toBe('completed');
    expect(await history()).toEqual(['assigned', 'in_progress', 'completed']);
  });

  it('keeps the total consistent with fee and discount on a price edit', async () => {
    const { updateBookingById } = await import('../src/model/order.model.js');
    await db.execute('UPDATE bookings SET discount_amount = 5000, total_amount = 100000 WHERE id = ?', [bookingId]);
    const updated = await updateBookingById(bookingId, { price: 120000 });
    expect(updated?.price).toBe(120000);
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT total_amount AS total, platform_fee AS fee, discount_amount AS discount FROM bookings WHERE id = ?',
      [bookingId],
    );
    expect(Number(rows[0]?.total)).toBe(120000 + Number(rows[0]?.fee) - Number(rows[0]?.discount));
  });

  it('stores the selected staff as cleaner assignments', async () => {
    const { updateBookingById } = await import('../src/model/order.model.js');
    const [cleaners] = await db.query<RowDataPacket[]>(
      'SELECT id, name FROM cleaners WHERE is_active = TRUE ORDER BY id LIMIT 2',
    );
    const names = cleaners.map((row) => String(row.name));
    await updateBookingById(
      bookingId,
      { staff: [names[0]] },
      { type: 'admin', userId: adminId },
    );
    const [assigned] = await db.query<RowDataPacket[]>(
      'SELECT cleaner_id AS id FROM cleaner_assignments WHERE booking_id = ?',
      [bookingId],
    );
    expect(assigned.map((row) => Number(row.id))).toEqual([
      Number(cleaners[0]?.id),
    ]);

    await updateBookingById(
      bookingId,
      { staff: [names[1]] },
      { type: 'admin', userId: adminId },
    );
    const [after] = await db.query<RowDataPacket[]>(
      'SELECT cleaner_id AS id FROM cleaner_assignments WHERE booking_id = ?',
      [bookingId],
    );
    expect(after).toHaveLength(1);
    expect(Number(after[0]?.id)).toBe(Number(cleaners[1]?.id));
  });

  it('exposes payment status separately from the booking status', async () => {
    await db.execute(
      `INSERT INTO payments (booking_id, method, amount, status, paid_at)
       VALUES (?, 'qris', 105000, 'paid', NOW())`,
      [bookingId],
    );
    const { findCustomerBooking } = await import('../src/model/booking.model.js');
    const { findOrder } = await import('../src/model/order.model.js');
    const customer = await findCustomerBooking(userId, bookingId);
    const admin = await findOrder(bookingId);
    expect(customer?.paymentStatus).toBe('paid');
    expect(customer?.status).toBe('completed');
    expect(admin?.paymentStatus).toBe('paid');
    expect(admin?.status).toBe('Selesai');
  });
});
