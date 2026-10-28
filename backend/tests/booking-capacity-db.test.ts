import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import 'dotenv/config';
import mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

const enabled = process.env.DB_NAME === 'cleango' && process.env.RUN_DB_TESTS === '1';
const suite = enabled ? describe : describe.skip;

function tomorrowJakarta(): string {
  const now = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
}

suite('booking capacity and conflicts (RUN_DB_TESTS=1)', () => {
  let db: mysql.Connection;
  const users: number[] = [];
  let serviceId = 0;
  let addressId = 0;
  const date = tomorrowJakarta();

  beforeAll(async () => {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'cleango',
    });
    const [s] = await db.execute<ResultSetHeader>(
      `INSERT INTO services (category_id, name, slug, description, price, duration_minutes, is_active)
       VALUES (5, ?, ?, 'uji', 100000, 60, TRUE)`,
      [`Uji Kapasitas ${Date.now()}`, `uji-kapasitas-${Date.now()}`],
    );
    serviceId = Number(s.insertId);
    const [u] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, password_hash, role) VALUES ('uji-kapasitas', ?, 'x', 'customer')`,
      [`uji-kapasitas-${Date.now()}@test.local`],
    );
    users.push(Number(u.insertId));
    const [a] = await db.execute<ResultSetHeader>(
      `INSERT INTO addresses (user_id, label, recipient_name, recipient_phone, street_address, is_primary)
       VALUES (?, 'Uji', 'Uji', '081200000000', 'Jl. Uji 1', TRUE)`,
      [users[0]],
    );
    addressId = Number(a.insertId);
  });

  afterAll(async () => {
    if (db && users.length) {
      await db.query('DELETE FROM notifications WHERE recipient_user_id IN (?)', [users]);
      await db.query('DELETE FROM bookings WHERE customer_id IN (?)', [users]);
      await db.execute('DELETE FROM services WHERE id = ?', [serviceId]);
      await db.query('DELETE FROM addresses WHERE user_id IN (?)', [users]);
      await db.query('DELETE FROM users WHERE id IN (?)', [users]);
      await db.end();
    }
  });

  it('keeps at most three bookings per slot under parallel requests', async () => {
    const { createBooking, BookingConflictError } = await import('../src/model/booking.model.js');
    for (let index = 1; index < 4; index += 1) {
      const [u] = await db.execute<ResultSetHeader>(
        `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, 'x', 'customer')`,
        [`uji-kapasitas-${index}`, `uji-kapasitas-${index}-${Date.now()}@test.local`],
      );
      users.push(Number(u.insertId));
      await db.execute(
        `INSERT INTO addresses (user_id, label, recipient_name, recipient_phone, street_address, is_primary)
         VALUES (?, 'Uji', 'Uji', '081200000000', 'Jl. Uji 1', TRUE)`,
        [users[index]],
      );
    }

    const attempts = await Promise.allSettled(
      users.slice(0, 4).map((customerId, index) =>
        createBooking({
          customerId,
          serviceId,
          addressId: index === 0 ? addressId : addressId + index,
          date,
          time: '15:00',
          notes: '',
        } as Parameters<typeof createBooking>[0]),
      ),
    );

    const ok = attempts.filter((result) => result.status === 'fulfilled');
    const failed = attempts.filter(
      (result) =>
        result.status === 'rejected' &&
        result.reason instanceof BookingConflictError &&
        ['SLOT_FULL', 'BUSY'].includes(result.reason.reason),
    );
    expect(ok.length).toBeLessThanOrEqual(3);
    expect(ok.length + failed.length).toBe(4);

    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM bookings WHERE scheduled_date = ? AND scheduled_start_time = ?',
      [date, '15:00:00'],
    );
    expect(Number(rows[0]?.total)).toBe(ok.length);
  });

  it('rolls back the booking when an address is not owned', async () => {
    const { createBooking } = await import('../src/model/booking.model.js');
    const before = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM bookings WHERE scheduled_date = ?',
      [date],
    );
    await expect(
      createBooking({
        customerId: users[0],
        serviceId,
        addressId: addressId + 99,
        date,
        time: '08:00',
        notes: '',
      } as Parameters<typeof createBooking>[0]),
    ).rejects.toThrow('ADDRESS_NOT_OWNED');
    const after = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM bookings WHERE scheduled_date = ?',
      [date],
    );
    expect(Number(after[0][0]?.total)).toBe(Number(before[0][0]?.total));
  });
});
