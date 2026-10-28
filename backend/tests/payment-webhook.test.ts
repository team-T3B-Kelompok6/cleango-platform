import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import 'dotenv/config';
import { createHmac } from 'node:crypto';
import mysql from 'mysql2/promise';
import type { ResultSetHeader } from 'mysql2';

const enabled = process.env.DB_NAME === 'cleango' && process.env.RUN_DB_TESTS === '1';
const secret = 'uji-webhook-secret';
process.env.PAYMENT_WEBHOOK_SECRET = secret;

const suite = enabled ? describe : describe.skip;

suite('payment webhook (RUN_DB_TESTS=1)', () => {
  let db: mysql.Connection;
  let app: Awaited<ReturnType<typeof import('../src/app.js')['createApp']>>;
  let customer = 0;
  let bookingId = 0;
  let serviceId = 0;

  const sign = (body: string) =>
    createHmac('sha256', secret).update(body).digest('hex');

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
      `INSERT INTO users (name, email, password_hash, role) VALUES ('uji-hook', ?, 'x', 'customer')`,
      [`uji-hook-${stamp}@test.local`],
    );
    customer = Number(u.insertId);
    const [a] = await db.execute<ResultSetHeader>(
      `INSERT INTO addresses (user_id, label, recipient_name, recipient_phone, street_address, is_primary)
       VALUES (?, 'Uji', 'Uji', '081200000000', 'Jl. Uji 1', TRUE)`,
      [customer],
    );
    const [s] = await db.execute<ResultSetHeader>(
      `INSERT INTO services (category_id, name, slug, description, price, duration_minutes, is_active)
       VALUES (5, ?, ?, 'uji', 100000, 60, TRUE)`,
      [`Uji Hook ${stamp}`, `uji-hook-${stamp}`],
    );
    serviceId = Number(s.insertId);
    const [b] = await db.execute<ResultSetHeader>(
      `INSERT INTO bookings (booking_code, customer_id, service_id, address_id,
         scheduled_date, scheduled_start_time, service_price, service_duration_minutes,
         platform_fee, discount_amount, total_amount, status)
       VALUES (?, ?, ?, ?, '2026-12-22', '09:00:00', 100000, 60, 5000, 0, 105000, 'confirmed')`,
      [`UH${stamp}`, customer, serviceId, Number(a.insertId)],
    );
    bookingId = Number(b.insertId);
    const { startBookingPayment } = await import('../src/model/payment.model.js');
    await startBookingPayment(customer, bookingId, 'cash');
    const { createApp } = await import('../src/app.js');
    app = createApp();
  });

  afterAll(async () => {
    if (db && bookingId) {
      await db.query('DELETE FROM notifications WHERE booking_id = ?', [bookingId]);
      await db.query('DELETE FROM payments WHERE booking_id = ?', [bookingId]);
      await db.query('DELETE FROM bookings WHERE id = ?', [bookingId]);
      await db.execute('DELETE FROM services WHERE id = ?', [serviceId]);
      await db.query('DELETE FROM addresses WHERE user_id = ?', [customer]);
      await db.query('DELETE FROM users WHERE id = ?', [customer]);
      await db.end();
    }
  });

  it('rejects a bad signature', async () => {
    const payload = JSON.stringify({
      bookingId,
      status: 'paid',
      amount: 105000,
      reference: 'GW-9',
    });
    const response = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Payment-Signature', 'deadbeef')
      .send(payload);
    expect(response.status).toBe(401);
  });

  it('rejects a mismatched amount', async () => {
    const payload = JSON.stringify({
      bookingId,
      status: 'paid',
      amount: 1,
      reference: 'GW-9',
    });
    const response = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Payment-Signature', sign(payload))
      .send(payload);
    expect(response.status).toBe(409);
  });

  it('marks the payment paid with a valid signature', async () => {
    const payload = JSON.stringify({
      bookingId,
      status: 'paid',
      amount: 105000,
      reference: 'GW-9',
    });
    const response = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Payment-Signature', sign(payload))
      .send(payload);
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('paid');
  });
});
