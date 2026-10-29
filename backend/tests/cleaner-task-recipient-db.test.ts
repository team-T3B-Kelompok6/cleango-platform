import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import 'dotenv/config';
import mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

const enabled = process.env.DB_NAME === 'cleango' && process.env.RUN_DB_TESTS === '1';
const suite = enabled ? describe : describe.skip;

suite('cleaner task recipient identity against the database (RUN_DB_TESTS=1)', () => {
  let db: mysql.Connection;
  let customerId = 0;
  let adminId = 0;
  let cleanerId = 0;
  let serviceId = 0;
  let addressId = 0;
  let bookingId = 0;
  let accountPhone = '';
  const token = `recipient-${Date.now()}`;
  let tokenHash = '';

  beforeAll(async () => {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'cleango',
    });
    const stamp = Date.now();
    accountPhone = `62812${String(stamp).slice(-7)}`;
    const [customer] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, phone, password_hash, role, is_active)
       VALUES ('Bintang Putra', ?, ?, 'x', 'customer', TRUE)`,
      [`uji-task-recipient-${stamp}@test.local`, accountPhone],
    );
    customerId = Number(customer.insertId);
    const [admin] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ('uji-task-admin', ?, 'x', 'admin', TRUE)`,
      [`uji-task-admin-${stamp}@test.local`],
    );
    adminId = Number(admin.insertId);
    const [address] = await db.execute<ResultSetHeader>(
      `INSERT INTO addresses
         (user_id, label, recipient_name, recipient_phone, street_address, city, province, is_primary)
       VALUES (?, 'Kantor', 'Timothy', '082140636747', ?, 'Malang', 'Jawa Timur', TRUE)`,
      [
        customerId,
        'Jalan Depan Rektorat, Ketawanggede, Lowokwaru, Kota Malang, Jawa Timur, 65145, Indonesia',
      ],
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
      [Number(category[0].id), `Uji Task ${stamp}`, `uji-task-${stamp}`],
    );
    serviceId = Number(service.insertId);
    const [cleaner] = await db.execute<ResultSetHeader>(
      `INSERT INTO cleaners (name, phone, area, status, average_rating, is_active)
       VALUES ('Uji Task Cleaner', '081200000099', 'Malang', 'available', 0, TRUE)`,
    );
    cleanerId = Number(cleaner.insertId);
    const [booking] = await db.execute<ResultSetHeader>(
      `INSERT INTO bookings
         (booking_code, customer_id, service_id, address_id, scheduled_date,
          scheduled_start_time, service_price, service_duration_minutes,
          platform_fee, discount_amount, total_amount, status)
       VALUES (?, ?, ?, ?, '2026-12-12', '09:00:00', 100000, 60, 5000, 0, 105000, 'in_progress')`,
      [`TR${stamp}`, customerId, serviceId, addressId],
    );
    bookingId = Number(booking.insertId);
    const { hashToken } = await import('../src/model/cleaner-task.model.js');
    tokenHash = hashToken(token);
    await db.execute(
      `INSERT INTO cleaner_assignments
         (booking_id, cleaner_id, assigned_by, link_token_hash, link_expires_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))`,
      [bookingId, cleanerId, adminId, tokenHash],
    );
  });

  afterAll(async () => {
    if (db) {
      if (bookingId)
        await db.execute('DELETE FROM cleaner_assignments WHERE booking_id = ?', [bookingId]);
      if (bookingId) await db.execute('DELETE FROM bookings WHERE id = ?', [bookingId]);
      if (addressId) await db.execute('DELETE FROM addresses WHERE id = ?', [addressId]);
      if (serviceId) await db.execute('DELETE FROM services WHERE id = ?', [serviceId]);
      if (cleanerId) await db.execute('DELETE FROM cleaners WHERE id = ?', [cleanerId]);
      if (customerId || adminId)
        await db.query('DELETE FROM users WHERE id IN (?)', [[customerId, adminId]]);
      await db.end();
    }
  });

  it('uses the selected address recipient and a clean address', async () => {
    const { findAssignmentByTokenHash } = await import(
      '../src/model/cleaner-task.model.js'
    );
    const row = await findAssignmentByTokenHash(tokenHash);
    expect(row?.customerName).toBe('Timothy');
    expect(row?.customerPhone).toBe('082140636747');
    expect(row?.address).toBe(
      'Jalan Depan Rektorat, Ketawanggede, Lowokwaru, Kota Malang, Jawa Timur, 65145, Indonesia',
    );
  });

  it('falls back to the account when the address recipient is blank', async () => {
    await db.execute(
      "UPDATE addresses SET recipient_name = '', recipient_phone = '' WHERE id = ?",
      [addressId],
    );
    const { findAssignmentByTokenHash } = await import(
      '../src/model/cleaner-task.model.js'
    );
    const row = await findAssignmentByTokenHash(tokenHash);
    expect(row?.customerName).toBe('Bintang Putra');
    expect(row?.customerPhone).toBe(accountPhone);
  });
});
