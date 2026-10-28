import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import type { ResultSetHeader } from 'mysql2';

const enabled = process.env.DB_NAME === 'cleango' && process.env.RUN_DB_TESTS === '1';
const suite = enabled ? describe : describe.skip;

suite('operational report and risk alerts (RUN_DB_TESTS=1)', () => {
  let db: mysql.Connection;
  let customer = 0;
  let admin = 0;
  let cleaner = 0;
  let serviceId = 0;
  let addressId = 0;
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
      `INSERT INTO users (name, email, password_hash, role) VALUES ('uji-report', ?, 'x', 'customer')`,
      [`uji-report-${stamp}@test.local`],
    );
    customer = Number(u.insertId);
    const [a] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, password_hash, role) VALUES ('uji-report-admin', ?, 'x', 'admin')`,
      [`uji-report-admin-${stamp}@test.local`],
    );
    admin = Number(a.insertId);
    const [c] = await db.execute<ResultSetHeader>(
      `INSERT INTO cleaners (name, phone, area, status, average_rating, is_active)
       VALUES (?, ?, 'Uji', 'available', 0, TRUE)`,
      [`Uji Report Cleaner ${stamp}`, '081200000077'],
    );
    cleaner = Number(c.insertId);
    const [addr] = await db.execute<ResultSetHeader>(
      `INSERT INTO addresses (user_id, label, recipient_name, recipient_phone, street_address, is_primary)
       VALUES (?, 'Uji', 'Uji', '081200000000', 'Jl. Uji 1', TRUE)`,
      [customer],
    );
    addressId = Number(addr.insertId);
    const [s] = await db.execute<ResultSetHeader>(
      `INSERT INTO services (category_id, name, slug, description, price, duration_minutes, is_active)
       VALUES (5, ?, ?, 'uji', 100000, 60, TRUE)`,
      [`Uji Report ${stamp}`, `uji-report-${stamp}`],
    );
    serviceId = Number(s.insertId);

    const insertBooking = async (
      code: string,
      status: string,
      date: string,
      time: string,
    ) => {
      const [row] = await db.execute<ResultSetHeader>(
        `INSERT INTO bookings (booking_code, customer_id, service_id, address_id,
           scheduled_date, scheduled_start_time, service_price, service_duration_minutes,
           platform_fee, discount_amount, total_amount, status,
           completed_at)
         VALUES (?, ?, ?, ?, ?, ?, 100000, 60, 5000, 0, 105000, ?,
           ${status === 'completed' ? `'${date} 10:00:00'` : 'NULL'})`,
        [code, customer, serviceId, addressId, date, time, status],
      );
      bookings.push(Number(row.insertId));
      return Number(row.insertId);
    };

    const completed = await insertBooking(`URP${stamp}1`, 'completed', '2026-01-10', '09:00:00');
    await db.execute(
      `INSERT INTO payments (booking_id, method, amount, status, paid_at)
       VALUES (?, 'qris', 105000, 'paid', '2026-01-10 10:00:00')`,
      [completed],
    );
    await db.execute(
      `INSERT INTO reviews (booking_id, customer_id, service_id, rating, comment, created_at)
       VALUES (?, ?, ?, 4, 'ok', '2026-01-10 11:00:00')`,
      [completed, customer, serviceId],
    );
    await insertBooking(`URP${stamp}2`, 'cancelled', '2026-01-10', '13:00:00');

    const late = await insertBooking(`URP${stamp}3`, 'assigned', '2026-01-10', '09:00:00');
    await db.execute(
      "UPDATE bookings SET scheduled_date = CURDATE(), scheduled_start_time = '00:01:00' WHERE id = ?",
      [late],
    );
    await db.execute(
      `INSERT INTO cleaner_assignments
         (booking_id, cleaner_id, assigned_by, link_token_hash, link_expires_at, link_status, location_sharing_started_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), 'active', NOW())`,
      [late, cleaner, admin, randomBytes(32).toString('hex')],
    );
    await db.execute(
      `INSERT INTO cleaner_task_stages (assignment_id, started_at, latitude, longitude, location_updated_at)
       SELECT ca.id, NOW(), -7.9, 112.6, DATE_SUB(NOW(), INTERVAL 30 MINUTE)
       FROM cleaner_assignments ca WHERE ca.booking_id = ?`,
      [late],
    );

    const old = await insertBooking(`URP${stamp}4`, 'assigned', '2026-01-10', '09:00:00');
    await db.execute(
      'UPDATE bookings SET scheduled_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY) WHERE id = ?',
      [old],
    );

    const working = await insertBooking(`URP${stamp}5`, 'in_progress', '2026-01-10', '08:00:00');
    await db.execute(
      `INSERT INTO cleaner_assignments
         (booking_id, cleaner_id, assigned_by, link_token_hash, link_expires_at, link_status, location_sharing_started_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), 'active', NOW())`,
      [working, cleaner, admin, randomBytes(32).toString('hex')],
    );
    await db.execute(
      `INSERT INTO cleaner_task_stages (assignment_id, started_at, latitude, longitude, location_updated_at)
       SELECT ca.id, NOW(), -7.9, 112.6, DATE_SUB(NOW(), INTERVAL 30 MINUTE)
       FROM cleaner_assignments ca WHERE ca.booking_id = ?`,
      [working],
    );
  });

  afterAll(async () => {
    if (db && bookings.length) {
      await db.query('DELETE FROM booking_risk_alerts WHERE booking_id IN (?)', [bookings]);
      await db.query('DELETE FROM notifications WHERE booking_id IN (?)', [bookings]);
      await db.query('DELETE FROM reviews WHERE booking_id IN (?)', [bookings]);
      await db.query('DELETE FROM payments WHERE booking_id IN (?)', [bookings]);
      await db.query('DELETE FROM booking_status_history WHERE booking_id IN (?)', [bookings]);
      await db.query('DELETE FROM cleaner_assignments WHERE booking_id IN (?)', [bookings]);
      await db.query('DELETE FROM bookings WHERE id IN (?)', [bookings]);
      await db.execute('DELETE FROM cleaners WHERE id = ?', [cleaner]);
      await db.execute('DELETE FROM services WHERE id = ?', [serviceId]);
      await db.execute('DELETE FROM addresses WHERE user_id = ?', [customer]);
      await db.query('DELETE FROM users WHERE id IN (?)', [[customer, admin]]);
      await db.end();
    }
  });

  it('summarises revenue from settled payments only', async () => {
    const { getReportSummary } = await import('../src/model/report.model.js');
    const summary = await getReportSummary('2026-01-01', '2026-01-31');
    expect(summary.revenue).toBe(105000);
    expect(summary.paidOrders).toBe(1);
    expect(summary.completedOrders).toBe(1);
    expect(summary.cancelledOrders).toBe(1);
    expect(summary.averageRating).toBe(4);
  });

  it('raises late, inactive-location and no-show alerts once', async () => {
    const { detectRiskAlerts, listRiskAlerts } = await import('../src/model/report.model.js');
    await detectRiskAlerts();
    await detectRiskAlerts();
    const alerts = (await listRiskAlerts()).filter((alert) =>
      bookings.includes(Number(alert.bookingId)),
    );
    const types = alerts.map((alert) => alert.riskType).sort();
    expect(types).toEqual(['late_arrival', 'location_inactive', 'no_show']);
    expect(alerts.every((alert) => alert.status === 'open')).toBe(true);
  });

  it('lets an admin acknowledge then resolve an alert', async () => {
    const { listRiskAlerts, updateAlertStatus } = await import('../src/model/report.model.js');
    const alert = (await listRiskAlerts('open')).find(
      (item) => Number(item.bookingId) === bookings[3],
    );
    expect(alert).toBeTruthy();
    const acknowledged = await updateAlertStatus(Number(alert!.id), 'acknowledged', admin);
    expect(acknowledged?.status).toBe('acknowledged');
    expect(acknowledged?.acknowledgedAt).not.toBeNull();

    const resolved = await updateAlertStatus(Number(alert!.id), 'resolved', admin);
    expect(resolved?.status).toBe('resolved');
    expect(resolved?.resolvedAt).not.toBeNull();
    expect(await updateAlertStatus(999999, 'resolved', admin)).toBeNull();
  });
});
