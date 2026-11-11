import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import 'dotenv/config';
import mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

const enabled = process.env.DB_NAME === 'cleango' && process.env.RUN_DB_TESTS === '1';
const suite = enabled ? describe : describe.skip;

suite('promo quota release on cancel and redeem on payment (RUN_DB_TESTS=1)', () => {
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
      `INSERT INTO users (name, email, password_hash, role) VALUES ('uji-release', ?, 'x', 'customer')`,
      [`uji-release-${Date.now()}@test.local`],
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
       VALUES (5, 'Uji Release', ?, 'uji', 100000, 60, TRUE)`,
      [`uji-release-${Date.now()}`],
    );
    serviceId = Number(s.insertId);
    const [p] = await db.execute<ResultSetHeader>(
      `INSERT INTO promos (code, name, description, discount_type, discount_value, maximum_discount,
         minimum_order, quota, used_count, starts_at, ends_at, is_active, scope,
         service_ids, per_customer_limit, stackable)
       VALUES (?, 'Uji Release 10%', 'uji', 'percentage', 10, 50000, 0, NULL, 0,
         '2020-01-01 00:00:00', '2030-01-01 00:00:00', TRUE, 'all', NULL, 1, FALSE)`,
      [`UJIR${Date.now().toString(36).toUpperCase()}`],
    );
    promoId = Number(p.insertId);
  });

  afterAll(async () => {
    if (db) {
      await db.execute('DELETE FROM promo_usages WHERE user_id = ?', [userId]);
      await db.execute('DELETE FROM notifications WHERE recipient_user_id = ?', [userId]);
      await db.execute('DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE customer_id = ?)', [userId]);
      await db.execute('DELETE FROM bookings WHERE customer_id = ?', [userId]);
      await db.execute('DELETE FROM promos WHERE id = ?', [promoId]);
      await db.execute('DELETE FROM services WHERE id = ?', [serviceId]);
      await db.execute('DELETE FROM addresses WHERE user_id = ?', [userId]);
      await db.execute('DELETE FROM users WHERE id = ?', [userId]);
      await db.end();
    }
  });

  it('releases the quota and decrements used_count when the booking is cancelled', async () => {
    const { createBooking, cancelCustomerBooking } = await import(
      '../src/model/booking.model.js'
    );
    const created = await createBooking({
      customerId: userId,
      serviceId,
      addressId,
      date: '2026-12-02',
      time: '09:00',
      notes: '',
      promo: { id: promoId, discountAmount: 10000, perCustomerLimit: 1 },
    } as Parameters<typeof createBooking>[0]);

    const [promoBefore] = await db.query<RowDataPacket[]>(
      'SELECT used_count AS c FROM promos WHERE id = ?',
      [promoId],
    );
    expect(Number(promoBefore[0]?.c)).toBe(1);

    const result = await cancelCustomerBooking(userId, created.id);
    expect(result.ok).toBe(true);

    const [usage] = await db.query<RowDataPacket[]>(
      'SELECT status FROM promo_usages WHERE booking_id = ?',
      [created.id],
    );
    expect(String(usage[0]?.status)).toBe('released');

    const [promoAfter] = await db.query<RowDataPacket[]>(
      'SELECT used_count AS c FROM promos WHERE id = ?',
      [promoId],
    );
    expect(Number(promoAfter[0]?.c)).toBe(0);
  });

  it('marks the promo usage as redeemed when the payment is paid', async () => {
    const { createBooking } = await import('../src/model/booking.model.js');
    const { startBookingPayment, applyPaymentEvent } = await import(
      '../src/model/payment.model.js'
    );
    const created = await createBooking({
      customerId: userId,
      serviceId,
      addressId,
      date: '2026-12-02',
      time: '10:00',
      notes: '',
      promo: { id: promoId, discountAmount: 10000, perCustomerLimit: 1 },
    } as Parameters<typeof createBooking>[0]);

    const started = await startBookingPayment(userId, created.id, 'cash');
    expect(started.ok).toBe(true);

    const [booking] = await db.query<RowDataPacket[]>(
      'SELECT total_amount AS total FROM bookings WHERE id = ?',
      [created.id],
    );
    const paid = await applyPaymentEvent({
      bookingId: created.id,
      status: 'paid',
      amount: Number(booking[0]?.total),
      reference: 'UJI-PAID',
    });
    expect(paid.ok).toBe(true);

    const [usage] = await db.query<RowDataPacket[]>(
      'SELECT status FROM promo_usages WHERE booking_id = ?',
      [created.id],
    );
    expect(String(usage[0]?.status)).toBe('redeemed');
  });
});
