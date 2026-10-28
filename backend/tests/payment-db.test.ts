import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import 'dotenv/config';
import mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

const enabled = process.env.DB_NAME === 'cleango' && process.env.RUN_DB_TESTS === '1';
const suite = enabled ? describe : describe.skip;

suite('booking payments against the database (RUN_DB_TESTS=1)', () => {
  let db: mysql.Connection;
  let customer = 0;
  let other = 0;
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
    for (const tag of ['a', 'b']) {
      const [row] = await db.execute<ResultSetHeader>(
        `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, 'x', 'customer')`,
        [`uji-pay-${tag}`, `uji-pay-${tag}-${stamp}@test.local`],
      );
      if (tag === 'a') customer = Number(row.insertId);
      else other = Number(row.insertId);
    }
    const [addr] = await db.execute<ResultSetHeader>(
      `INSERT INTO addresses (user_id, label, recipient_name, recipient_phone, street_address, is_primary)
       VALUES (?, 'Uji', 'Uji', '081200000000', 'Jl. Uji 1', TRUE)`,
      [customer],
    );
    const [svc] = await db.execute<ResultSetHeader>(
      `INSERT INTO services (category_id, name, slug, description, price, duration_minutes, is_active)
       VALUES (5, ?, ?, 'uji', 100000, 60, TRUE)`,
      [`Uji Pay ${stamp}`, `uji-pay-${stamp}`],
    );
    for (const [index, status] of ['confirmed', 'completed'].entries()) {
      const [row] = await db.execute<ResultSetHeader>(
        `INSERT INTO bookings (booking_code, customer_id, service_id, address_id,
           scheduled_date, scheduled_start_time, service_price, service_duration_minutes,
           platform_fee, discount_amount, total_amount, status)
         VALUES (?, ?, ?, ?, '2026-12-20', '09:00:00', 100000, 60, 5000, 0, 105000, ?)`,
        [`UP${stamp}${index}`, customer, Number(svc.insertId), Number(addr.insertId), status],
      );
      bookings.push(Number(row.insertId));
    }
  });

  afterAll(async () => {
    if (db && bookings.length) {
      await db.query('DELETE FROM notifications WHERE booking_id IN (?)', [bookings]);
      await db.query('DELETE FROM payments WHERE booking_id IN (?)', [bookings]);
      await db.query('DELETE FROM bookings WHERE id IN (?)', [bookings]);
      await db.query(
        'DELETE FROM services WHERE slug LIKE ?',
        [`uji-pay-%`],
      );
      await db.query('DELETE FROM addresses WHERE user_id IN (?)', [[customer, other]]);
      await db.query('DELETE FROM users WHERE id IN (?)', [[customer, other]]);
      await db.end();
    }
  });

  it('records a cash payment as pending with the server total', async () => {
    const { startBookingPayment } = await import('../src/model/payment.model.js');
    const first = await startBookingPayment(customer, bookings[0], 'cash');
    const again = await startBookingPayment(customer, bookings[0], 'cash');
    expect(first).toEqual({ ok: true, status: 'pending' });
    expect(again).toEqual({ ok: true, status: 'pending' });
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT method, status, amount FROM payments WHERE booking_id = ?',
      [bookings[0]],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.method).toBe('cash');
    expect(rows[0]?.status).toBe('pending');
    expect(Number(rows[0]?.amount)).toBe(105000);
  });

  it('rejects digital methods without a gateway, foreign bookings and closed orders', async () => {
    const { startBookingPayment } = await import('../src/model/payment.model.js');
    expect(await startBookingPayment(customer, bookings[0], 'qris')).toEqual({
      ok: false,
      reason: 'GATEWAY_UNAVAILABLE',
    });
    expect(await startBookingPayment(other, bookings[0], 'cash')).toEqual({
      ok: false,
      reason: 'NOT_FOUND',
    });
    expect(await startBookingPayment(customer, bookings[1], 'cash')).toEqual({
      ok: false,
      reason: 'CLOSED',
    });
  });

  it('settles a payment once the webhook amount matches', async () => {
    const { applyPaymentEvent } = await import('../src/model/payment.model.js');
    expect(
      await applyPaymentEvent({
        bookingId: bookings[0],
        status: 'paid',
        amount: 100000,
        reference: 'GW-1',
      }),
    ).toEqual({ ok: false, reason: 'AMOUNT_MISMATCH' });

    expect(
      await applyPaymentEvent({
        bookingId: bookings[0],
        status: 'paid',
        amount: 105000,
        reference: 'GW-1',
      }),
    ).toEqual({ ok: true, status: 'paid' });
    expect(
      await applyPaymentEvent({
        bookingId: bookings[0],
        status: 'paid',
        amount: 105000,
        reference: 'GW-1',
      }),
    ).toEqual({ ok: true, status: 'paid' });

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT p.status, p.paid_at AS paidAt, p.gateway_reference AS ref,
         (SELECT COUNT(*) FROM notifications n WHERE n.booking_id = p.booking_id AND n.type = 'payment') AS notices
       FROM payments p WHERE p.booking_id = ?`,
      [bookings[0]],
    );
    expect(rows[0]?.status).toBe('paid');
    expect(rows[0]?.paidAt).not.toBeNull();
    expect(rows[0]?.ref).toBe('GW-1');
    expect(Number(rows[0]?.notices)).toBe(1);
  });
});
