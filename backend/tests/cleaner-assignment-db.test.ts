import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

const enabled = process.env.DB_NAME === 'cleango' && process.env.RUN_DB_TESTS === '1';
const suite = enabled ? describe : describe.skip;
const hash = () => randomBytes(32).toString('hex');

suite('cleaner assignment conflicts (RUN_DB_TESTS=1)', () => {
  let db: mysql.Connection;
  let userId = 0;
  let adminId = 0;
  let serviceId = 0;
  let addressId = 0;
  let cleanerA = 0;
  let cleanerB = 0;
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
      `INSERT INTO users (name, email, password_hash, role) VALUES ('uji-assign', ?, 'x', 'customer')`,
      [`uji-assign-${stamp}@test.local`],
    );
    userId = Number(u.insertId);
    const [ad] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, password_hash, role) VALUES ('uji-assign-admin', ?, 'x', 'admin')`,
      [`uji-assign-admin-${stamp}@test.local`],
    );
    adminId = Number(ad.insertId);
    const [a] = await db.execute<ResultSetHeader>(
      `INSERT INTO addresses (user_id, label, recipient_name, recipient_phone, street_address, is_primary)
       VALUES (?, 'Uji', 'Uji', '081200000000', 'Jl. Uji 1', TRUE)`,
      [userId],
    );
    addressId = Number(a.insertId);
    const [s] = await db.execute<ResultSetHeader>(
      `INSERT INTO services (category_id, name, slug, description, price, duration_minutes, is_active)
       VALUES (5, ?, ?, 'uji', 100000, 60, TRUE)`,
      [`Uji Assign ${stamp}`, `uji-assign-${stamp}`],
    );
    serviceId = Number(s.insertId);
    for (const label of ['A', 'B']) {
      const [c] = await db.execute<ResultSetHeader>(
        `INSERT INTO cleaners (name, phone, area, status, average_rating, is_active)
         VALUES (?, ?, 'Uji', 'available', 0, TRUE)`,
        [`Uji Cleaner ${label} ${stamp}`, `08120000${label === 'A' ? '01' : '02'}`],
      );
      if (label === 'A') cleanerA = Number(c.insertId);
      else cleanerB = Number(c.insertId);
    }
    for (const [time, code] of [
      ['09:00:00', `UA${stamp}1`],
      ['09:30:00', `UA${stamp}2`],
    ] as const) {
      const [b] = await db.execute<ResultSetHeader>(
        `INSERT INTO bookings (booking_code, customer_id, service_id, address_id,
           scheduled_date, scheduled_start_time, service_price, service_duration_minutes,
           platform_fee, discount_amount, total_amount, status)
         VALUES (?, ?, ?, ?, '2026-12-10', ?, 100000, 60, 5000, 0, 105000, 'confirmed')`,
        [code.slice(0, 32), userId, serviceId, addressId, time],
      );
      bookings.push(Number(b.insertId));
    }
  });

  afterAll(async () => {
    if (db && bookings.length) {
      await db.query('DELETE FROM booking_status_history WHERE booking_id IN (?)', [bookings]);
      await db.query('DELETE FROM cleaner_assignments WHERE booking_id IN (?)', [bookings]);
      await db.query('DELETE FROM bookings WHERE id IN (?)', [bookings]);
      await db.query('DELETE FROM cleaners WHERE id IN (?)', [[cleanerA, cleanerB]]);
      await db.execute('DELETE FROM services WHERE id = ?', [serviceId]);
      await db.execute('DELETE FROM addresses WHERE user_id = ?', [userId]);
      await db.query('DELETE FROM users WHERE id IN (?)', [[userId, adminId]]);
      await db.end();
    }
  });

  it('rejects an overlapping job for the same cleaner', async () => {
    const { assignCleaner, AssignmentConflictError } = await import(
      '../src/model/cleaner-task.model.js'
    );
    await assignCleaner({
      bookingId: bookings[0],
      cleanerId: cleanerA,
      adminId,
      token: hash(),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    await expect(
      assignCleaner({
        bookingId: bookings[1],
        cleanerId: cleanerA,
        adminId,
        token: hash(),
        expiresAt: new Date(Date.now() + 86_400_000),
      }),
    ).rejects.toBeInstanceOf(AssignmentConflictError);
  });

  it('accepts the same slot for a different cleaner', async () => {
    const { assignCleaner } = await import('../src/model/cleaner-task.model.js');
    await assignCleaner({
      bookingId: bookings[1],
      cleanerId: cleanerB,
      adminId,
      token: hash(),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT cleaner_id AS c FROM cleaner_assignments WHERE booking_id = ?',
      [bookings[1]],
    );
    expect(Number(rows[0]?.c)).toBe(cleanerB);
  });

  it('allows a replacement after the old link was revoked', async () => {
    const { assignCleaner } = await import('../src/model/cleaner-task.model.js');
    await db.execute(
      `UPDATE cleaner_assignments SET link_status = 'revoked' WHERE booking_id = ?`,
      [bookings[0]],
    );
    await assignCleaner({
      bookingId: bookings[0],
      cleanerId: cleanerA,
      adminId,
      token: hash(),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT cleaner_id AS c, link_status AS s FROM cleaner_assignments WHERE booking_id = ?`,
      [bookings[0]],
    );
    expect(Number(rows[0]?.c)).toBe(cleanerA);
    expect(rows[0]?.s).toBe('active');
  });
  it('keeps the task path available to the admin monitor', async () => {
    const { ensureLinkPath } = await import('../src/model/cleaner-task.model.js');
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id, link_token_enc AS enc FROM cleaner_assignments WHERE booking_id = ?',
      [bookings[1]],
    );
    const path = await ensureLinkPath({
      assignmentId: Number(rows[0]?.id),
      linkTokenEnc: rows[0]?.enc ?? null,
    });
    expect(path).toMatch(/^\/tugas\/[A-Za-z0-9_-]+$/);
  });

  it('deduplicates a repeated event key', async () => {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id FROM cleaner_assignments WHERE booking_id = ?',
      [bookings[1]],
    );
    const assignmentId = Number(rows[0]?.id);
    const { claimEventKey } = await import('../src/model/cleaner-task.model.js');
    expect(await claimEventKey(assignmentId, 'event-key-123', 'depart')).toBe(true);
    expect(await claimEventKey(assignmentId, 'event-key-123', 'depart')).toBe(false);
  });
});
