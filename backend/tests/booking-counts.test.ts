import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const pool = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn() }));
vi.mock('../src/lib/db.js', () => ({ pool }));
import { findCustomer, listCustomers } from '../src/model/customer.model.js';
import { getReportSummary } from '../src/model/report.model.js';

let db: DatabaseSync;
beforeEach(() => {
  vi.resetAllMocks();
  db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (id INTEGER, name TEXT, email TEXT, phone TEXT, is_active INTEGER, created_at TEXT, role TEXT);
    CREATE TABLE addresses (user_id INTEGER, street_address TEXT, city TEXT, is_primary INTEGER);
    CREATE TABLE bookings (id INTEGER, customer_id INTEGER, total_amount INTEGER, status TEXT, scheduled_date TEXT, completed_at TEXT);
    CREATE TABLE payments (id INTEGER PRIMARY KEY, booking_id INTEGER UNIQUE, method TEXT, status TEXT, amount INTEGER, paid_at TEXT);
    CREATE TABLE reviews (rating INTEGER, created_at TEXT);
    INSERT INTO users VALUES (1, 'Customer', 'test@example.invalid', NULL, 1, '2026-11-01', 'customer');
    INSERT INTO bookings VALUES
      (1, 1, 100, 'awaiting_payment', '2026-11-15', NULL),
      (2, 1, 200, 'awaiting_payment', '2026-11-15', NULL),
      (3, 1, 300, 'confirmed', '2026-11-15', NULL),
      (4, 1, 400, 'assigned', '2026-11-15', NULL),
      (5, 1, 500, 'in_progress', '2026-11-15', NULL),
      (6, 1, 600, 'confirmed', '2026-11-15', NULL),
      (7, 1, 700, 'confirmed', '2026-11-15', NULL),
      (8, 1, 800, 'confirmed', '2026-11-15', NULL),
      (9, 1, 900, 'completed', '2026-11-15', '2026-11-15'),
      (10, 1, 1000, 'cancelled', '2026-11-15', NULL);
    INSERT INTO payments (booking_id, method, status, amount, paid_at) VALUES
      (2, 'qris', 'pending', 200, NULL),
      (3, 'qris', 'pending', 300, NULL),
      (4, 'qris', 'failed', 400, NULL),
      (5, 'qris', 'expired', 500, NULL),
      (6, 'qris', 'paid', 600, '2026-11-15'),
      (7, 'cash', 'pending', 700, NULL),
      (9, 'qris', 'paid', 900, '2026-11-15');
  `);
  pool.query.mockImplementation(async (sql: string, params: number[] = []) => [
    db.prepare(sql).all(...params).map((row) => ({ ...row, createdAt: new Date(String(row.createdAt)) })),
  ]);
  pool.execute.mockImplementation(async (sql: string, params: string[]) => [db.prepare(sql).all(...params)]);
});
afterEach(() => db.close());

it('customer list and detail count only accepted bookings, retaining unpaid cash and historical admin rows', async () => {
  // Paid digital + confirmed cash + admin-created + completed + cancelled; never checkout drafts.
  expect(await listCustomers()).toMatchObject([{ orderCount: 5, totalSpent: 4000 }]);
  expect(await findCustomer(1)).toMatchObject({ orderCount: 5, totalSpent: 4000 });
  expect(await findCustomer(999)).toBeNull();
  expect(db.prepare('SELECT COUNT(*) AS total FROM bookings').get()?.total).toBe(10);
  expect(db.prepare("SELECT status FROM payments WHERE booking_id = 2").get()?.status).toBe('pending');
});

it('verified digital payment moves a stored checkout into counts once, without creating bookings or charges', async () => {
  db.exec("UPDATE bookings SET status = 'confirmed' WHERE id = 2; UPDATE payments SET status = 'paid', paid_at = '2026-11-15' WHERE booking_id = 2");
  for (let attempt = 0; attempt < 2; attempt++) {
    expect(await findCustomer(1)).toMatchObject({ orderCount: 6, totalSpent: 4200 });
  }
  expect(db.prepare('SELECT COUNT(*) AS total FROM bookings').get()?.total).toBe(10);
  expect(db.prepare('SELECT COUNT(*) AS total FROM payments').get()?.total).toBe(7);
});

it('dashboard active counts match confirmed digital/cash/admin rows, preserving settled revenue and history', async () => {
  expect(await getReportSummary('2026-11-01', '2026-11-30')).toMatchObject({
    activeOrders: 3, completedOrders: 1, cancelledOrders: 1, paidOrders: 2, revenue: 1500,
  });
});
