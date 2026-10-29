import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import 'dotenv/config';
import mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { Promo } from '../src/model/promo.model.js';

const enabled = process.env.DB_NAME === 'cleango' && process.env.RUN_DB_TESTS === '1';
const suite = enabled ? describe : describe.skip;

suite('promo notifications and retention against the database (RUN_DB_TESTS=1)', () => {
  let db: mysql.Connection;
  let activeCustomer = 0;
  let inactiveCustomer = 0;
  let adminId = 0;
  let currentPromo = 0;
  let expiredPromo = 0;

  beforeAll(async () => {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'cleango',
    });
    const stamp = Date.now();
    const [active] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ('uji-promo-active', ?, 'x', 'customer', TRUE)`,
      [`uji-promo-active-${stamp}@test.local`],
    );
    activeCustomer = Number(active.insertId);
    const [inactive] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ('uji-promo-inactive', ?, 'x', 'customer', FALSE)`,
      [`uji-promo-inactive-${stamp}@test.local`],
    );
    inactiveCustomer = Number(inactive.insertId);
    const [admin] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ('uji-promo-admin', ?, 'x', 'admin', TRUE)`,
      [`uji-promo-admin-${stamp}@test.local`],
    );
    adminId = Number(admin.insertId);

    const [current] = await db.execute<ResultSetHeader>(
      `INSERT INTO promos
         (code, name, discount_type, discount_value, minimum_order, starts_at, ends_at,
          is_active, scope, service_ids, per_customer_limit, stackable)
       VALUES (?, 'Promo Aktif', 'percentage', 20, 0,
         DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 1 DAY),
         TRUE, 'all', '[]', 1, FALSE)`,
      [`AKTIF${stamp}`],
    );
    currentPromo = Number(current.insertId);
    const [expired] = await db.execute<ResultSetHeader>(
      `INSERT INTO promos
         (code, name, discount_type, discount_value, minimum_order, starts_at, ends_at,
          is_active, scope, service_ids, per_customer_limit, stackable)
       VALUES (?, 'Promo Lama', 'fixed', 10000, 0,
         DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY),
         TRUE, 'all', '[]', 1, FALSE)`,
      [`LAMA${stamp}`],
    );
    expiredPromo = Number(expired.insertId);
  });

  afterAll(async () => {
    if (db) {
      await db.query('DELETE FROM notifications WHERE promo_id IN (?)', [
        [currentPromo, expiredPromo],
      ]);
      await db.query('DELETE FROM notifications WHERE recipient_user_id IN (?)', [
        [activeCustomer, inactiveCustomer, adminId],
      ]);
      await db.query('DELETE FROM promos WHERE id IN (?)', [
        [currentPromo, expiredPromo],
      ]);
      await db.query('DELETE FROM users WHERE id IN (?)', [
        [activeCustomer, inactiveCustomer, adminId],
      ]);
      await db.end();
    }
  });

  function promo(id: number, name: string, code: string): Promo {
    return {
      id: String(id),
      name,
      code,
      discountType: 'percentage',
      discountValue: 20,
      maxDiscount: null,
      minPurchase: 0,
      scope: 'all',
      serviceIds: [],
      startsOn: '2026-10-01',
      endsOn: '2026-12-31',
      usageLimit: null,
      perCustomerLimit: 1,
      stackable: false,
      active: true,
    };
  }

  it('notifies only active customers and hides expired promo notifications', async () => {
    const { upsertPromoNotifications, listNotifications, countUnreadNotifications } =
      await import('../src/model/notification.model.js');

    await upsertPromoNotifications(promo(currentPromo, 'Promo Aktif', 'AKTIF'));
    await upsertPromoNotifications(promo(expiredPromo, 'Promo Lama', 'LAMA'));

    const activeRows = await listNotifications(activeCustomer);
    expect(activeRows).toHaveLength(1);
    expect(activeRows[0]?.type).toBe('promo');
    expect(activeRows[0]?.title).toContain('Promo Aktif');
    expect(await countUnreadNotifications(activeCustomer)).toBe(1);

    expect(await listNotifications(inactiveCustomer)).toEqual([]);
    expect(await listNotifications(adminId)).toEqual([]);
  });

  it('does not duplicate notifications when the same promo is broadcast again', async () => {
    const { upsertPromoNotifications, listNotifications } = await import(
      '../src/model/notification.model.js'
    );
    await upsertPromoNotifications(promo(currentPromo, 'Promo Aktif', 'AKTIF'));
    const rows = await listNotifications(activeCustomer);
    expect(rows.filter((row) => row.type === 'promo')).toHaveLength(1);
  });

  it('deletes notifications older than one month', async () => {
    const { purgeOldNotifications, listNotifications } = await import(
      '../src/model/notification.model.js'
    );
    await db.execute(
      `INSERT INTO notifications
         (recipient_user_id, type, title, message, created_at)
       VALUES (?, 'system', 'Lama', 'Notifikasi lama', DATE_SUB(NOW(), INTERVAL 2 MONTH))`,
      [activeCustomer],
    );
    const deleted = await purgeOldNotifications();
    expect(deleted).toBeGreaterThanOrEqual(1);
    const rows = await listNotifications(activeCustomer);
    expect(rows.some((row) => row.title === 'Lama')).toBe(false);
    expect(rows.some((row) => row.type === 'promo')).toBe(true);
  });
});
