import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import 'dotenv/config';
import mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

const enabled = process.env.DB_NAME === 'cleango' && process.env.RUN_DB_TESTS === '1';
const suite = enabled ? describe : describe.skip;

suite('booking promo persists the server discount (RUN_DB_TESTS=1)', () => {
  let db: mysql.Connection;
  let userId = 0;
  let addressId = 0;
  let serviceId = 0;
  let promoId = 0;

  beforeAll(async () => {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'cleango',
    });
    const [u] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, password_hash, role) VALUES ('uji-promo', ?, 'x', 'customer')`,
      [`uji-promo-${Date.now()}@test.local`],
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
       VALUES (5, 'Uji Promo', ?, 'uji', 100000, 60, TRUE)`,
      [`uji-promo-${Date.now()}`],
    );
    serviceId = Number(s.insertId);
    const [p] = await db.execute<ResultSetHeader>(
      `INSERT INTO promos (code, name, description, discount_type, discount_value, maximum_discount,
         minimum_order, quota, used_count, starts_at, ends_at, is_active, scope,
         service_ids, per_customer_limit, stackable)
       VALUES (?, 'Uji 10%', 'uji', 'percentage', 10, 50000, 0, NULL, 0,
         '2020-01-01 00:00:00', '2030-01-01 00:00:00', TRUE, 'all', NULL, 1, FALSE)`,
      [`UJI${Date.now().toString(36).toUpperCase()}`],
    );
    promoId = Number(p.insertId);
  });

  afterAll(async () => {
    if (db) {
      await db.execute('DELETE FROM promo_usages WHERE user_id = ?', [userId]);
      await db.execute('DELETE FROM notifications WHERE recipient_user_id = ?', [userId]);
      await db.execute('DELETE FROM bookings WHERE customer_id = ?', [userId]);
      await db.execute('DELETE FROM promos WHERE id = ?', [promoId]);
      await db.execute('DELETE FROM services WHERE id = ?', [serviceId]);
      await db.execute('DELETE FROM addresses WHERE user_id = ?', [userId]);
      await db.execute('DELETE FROM users WHERE id = ?', [userId]);
      await db.end();
    }
  });

  it('stores the discount, total and usage when a promo is applied', async () => {
    const { createBooking, findCustomerBooking } = await import('../src/model/booking.model.js');
    const created = await createBooking({
      customerId: userId,
      serviceId,
      addressId,
      date: '2026-12-02',
      time: '09:00',
      notes: '',
      promo: { id: promoId, discountAmount: 10000, perCustomerLimit: 1 },
    } as Parameters<typeof createBooking>[0]);

    const booking = await findCustomerBooking(userId, created.id);
    expect(booking?.servicePrice).toBe(100000);
    expect(booking?.discountAmount).toBe(10000);
    expect(booking?.totalAmount).toBe(95000);
    expect(booking?.promoCode).toMatch(/^UJI/);

    const [usage] = await db.query<RowDataPacket[]>(
      'SELECT discount_amount AS d FROM promo_usages WHERE booking_id = ?',
      [created.id],
    );
    expect(Number(usage[0]?.d)).toBe(10000);
    const [promo] = await db.query<RowDataPacket[]>(
      'SELECT used_count AS c FROM promos WHERE id = ?',
      [promoId],
    );
    expect(Number(promo[0]?.c)).toBe(1);
  });

  it('rejects a second use when the per-customer limit is reached', async () => {
    const { createBooking } = await import('../src/model/booking.model.js');
    await expect(
      createBooking({
        customerId: userId,
        serviceId,
        addressId,
        date: '2026-12-02',
        time: '10:00',
        notes: '',
        promo: { id: promoId, discountAmount: 10000, perCustomerLimit: 1 },
      } as Parameters<typeof createBooking>[0]),
    ).rejects.toMatchObject({ reason: 'PROMO_LIMIT' });
  });
});
