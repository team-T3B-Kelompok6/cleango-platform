import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import 'dotenv/config';
import mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

const enabled = process.env.DB_NAME === 'cleango' && process.env.RUN_DB_TESTS === '1';
const suite = enabled ? describe : describe.skip;

suite('catalog edit does not change existing bookings (RUN_DB_TESTS=1)', () => {
  let db: mysql.Connection;
  let userId = 0;
  let addressId = 0;
  let serviceId = 0;
  let bookingId = 0;

  beforeAll(async () => {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'cleango',
    });
    const [u] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, password_hash, role) VALUES ('uji-snapshot', ?, 'x', 'customer')`,
      [`uji-snap-${Date.now()}@test.local`],
    );
    userId = Number(u.insertId);
    const [a] = await db.execute<ResultSetHeader>(
      `INSERT INTO addresses (user_id, label, recipient_name, recipient_phone, street_address, is_primary)
       VALUES (?, 'Uji', 'Uji', '081200000000', 'Jl. Uji 1', TRUE)`,
      [userId],
    );
    addressId = Number(a.insertId);
    const [s] = await db.execute<ResultSetHeader>(
      `INSERT INTO services (category_id, name, slug, description, price, duration_minutes, is_active)
       VALUES (5, 'Uji Snapshot', ?, 'uji', 100000, 90, TRUE)`,
      [`uji-snapshot-${Date.now()}`],
    );
    serviceId = Number(s.insertId);
  });

  afterAll(async () => {
    if (db) {
      await db.execute('DELETE FROM notifications WHERE recipient_user_id = ?', [userId]);
      await db.execute('DELETE FROM bookings WHERE customer_id = ?', [userId]);
      await db.execute('DELETE FROM services WHERE id = ?', [serviceId]);
      await db.execute('DELETE FROM addresses WHERE user_id = ?', [userId]);
      await db.execute('DELETE FROM users WHERE id = ?', [userId]);
      await db.end();
    }
  });

  it('keeps the booking price and duration after the catalog changes', async () => {
    const { createBooking, findCustomerBooking } = await import('../src/model/booking.model.js');
    const { updatePlatformService, findPlatformService } = await import(
      '../src/model/platform-service.model.js'
    );
    const created = await createBooking({
      customerId: userId,
      serviceId,
      addressId,
      date: '2026-12-01',
      time: '09:00',
      notes: '',
    } as Parameters<typeof createBooking>[0]);
    bookingId = created.id;

    await updatePlatformService(serviceId, { price: 250000, durationMinutes: 150, duration: '150 menit' });

    const booking = await findCustomerBooking(userId, bookingId);
    expect(booking?.servicePrice).toBe(100000);
    expect(booking?.serviceDurationMinutes).toBe(90);

    const catalog = await findPlatformService(serviceId);
    expect(catalog?.price).toBe(250000);
    expect(catalog?.duration).toBe('150 menit');
  });

  it('reads back an image url saved by the admin catalog', async () => {
    const { updatePlatformService, findPlatformService } = await import(
      '../src/model/platform-service.model.js'
    );
    await updatePlatformService(serviceId, { imageUrl: '/uploads/uji.jpg' });
    expect((await findPlatformService(serviceId))?.imageUrl).toBe('/uploads/uji.jpg');
  });
});
