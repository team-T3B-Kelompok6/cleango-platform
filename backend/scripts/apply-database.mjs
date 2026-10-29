import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';

const sql = await readFile(new URL('../database.sql', import.meta.url), 'utf8');
const schemaOnly = process.argv.includes('--schema-only');
if (
  schemaOnly &&
  ((process.env.DB_NAME ?? 'cleango') !== 'cleango' ||
    !['localhost', '127.0.0.1', '::1'].includes(
      process.env.DB_HOST ?? '127.0.0.1',
    ) ||
    process.env.NODE_ENV === 'production')
) {
  throw new Error(
    '--schema-only hanya diizinkan untuk database cleango lokal.',
  );
}
// Extract only table definitions; never execute the seed in schema-only mode.
const tableDefinitions = [
  ...sql.matchAll(
    /^CREATE TABLE IF NOT EXISTS \w+ \([\s\S]*?^\) ENGINE=InnoDB;/gm,
  ),
].map((match) => match[0]);
if (!tableDefinitions.length)
  throw new Error('Definisi tabel tidak ditemukan.');
const connection = await mysql.createConnection({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  multipleStatements: true,
});

try {
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS cleango CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.query('USE cleango');
  await ensureColumn(
    'cleaner_assignments',
    'link_token_enc',
    '`link_token_enc` VARCHAR(512) NULL AFTER `link_token_hash`',
  );
  if (schemaOnly) {
    const [target] = await connection.query('SELECT DATABASE() AS name');
    if (target[0]?.name !== 'cleango')
      throw new Error('Target database tidak sesuai.');
  }
  for (const definition of tableDefinitions)
    await connection.query(definition);

  async function ensureColumn(table, column, definition) {
    const [tables] = await connection.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = ? AND table_name = ? LIMIT 1`,
      ['cleango', table],
    );
    if (!tables[0]) return;
    const [columns] = await connection.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = ? AND table_name = ? AND column_name = ? LIMIT 1`,
      ['cleango', table, column],
    );
    if (!columns[0])
      await connection.query(
        `ALTER TABLE cleango.\`${table}\` ADD COLUMN ${definition}`,
      );
  }

  async function ensureIndex(table, indexName, columns) {
    const [existing] = await connection.query(
      `SELECT 1 FROM information_schema.statistics
       WHERE table_schema = 'cleango' AND table_name = ? AND index_name = ?
       LIMIT 1`,
      [table, indexName],
    );
    if (!existing[0])
      await connection.query(
        `ALTER TABLE cleango.\`${table}\` ADD INDEX \`${indexName}\` (${columns})`,
      );
  }

  async function ensureUniqueIndex(
    table,
    indexName,
    columns,
    dropIndexes = [],
  ) {
    const [existing] = await connection.query(
      `SELECT 1 FROM information_schema.statistics
       WHERE table_schema = 'cleango' AND table_name = ? AND index_name = ?
       LIMIT 1`,
      [table, indexName],
    );
    const changes = existing[0]
      ? []
      : [`ADD UNIQUE KEY \`${indexName}\` (${columns})`];
    for (const drop of dropIndexes) {
      const [found] = await connection.query(
        `SELECT 1 FROM information_schema.statistics
         WHERE table_schema = 'cleango' AND table_name = ? AND index_name = ?
         LIMIT 1`,
        [table, drop],
      );
      if (found[0]) {
        changes.push(`DROP INDEX \`${drop}\``);
      }
    }
    if (changes.length)
      await connection.query(
        `ALTER TABLE cleango.\`${table}\` ${changes.join(', ')}`,
      );
  }

  await ensureColumn(
    'service_categories',
    'resource',
    "`resource` ENUM('services','faqs') NOT NULL DEFAULT 'services' AFTER `name`",
  );
  // The name must be unique per resource, not globally, so "Kantor" can exist
  // as both a service and a FAQ category.
  await ensureUniqueIndex(
    'service_categories',
    'uq_categories_resource_name',
    '`resource`, `name`',
    ['uq_service_categories_name'],
  );
  // Existing FAQ categories live as free text on the faqs rows; promote them so
  // the FAQ category panel is not empty and old FAQs keep matching.
  await connection.query(
    `INSERT INTO cleango.service_categories (name, resource, is_active)
     SELECT DISTINCT f.category, 'faqs', 1
     FROM cleango.faqs f
     WHERE f.category IS NOT NULL AND TRIM(f.category) <> ''
       AND NOT EXISTS (
         SELECT 1 FROM cleango.service_categories c
         WHERE c.resource = 'faqs' AND c.name = f.category
       )`,
  );

  await ensureColumn(
    'faqs',
    'view_count',
    '`view_count` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `category`',
  );
  await ensureColumn(
    'users',
    'avatar_url',
    '`avatar_url` VARCHAR(500) NULL AFTER `phone`',
  );
  await ensureColumn(
    'users',
    'auth_provider',
    "`auth_provider` ENUM('local','google','facebook') NOT NULL DEFAULT 'local' AFTER `role`",
  );
  await ensureColumn(
    'notifications',
    'promo_id',
    '`promo_id` BIGINT UNSIGNED NULL AFTER `booking_id`',
  );
  await ensureUniqueIndex(
    'notifications',
    'uq_notifications_promo',
    '`recipient_user_id`, `promo_id`',
  );
  await ensureIndex('notifications', 'idx_notifications_promo', '`promo_id`');
  await ensureIndex('notifications', 'idx_notifications_created', '`created_at`');
  await ensureColumn(
    'users',
    'password_changed_at',
    '`password_changed_at` DATETIME NULL AFTER `is_active`',
  );
  await ensureColumn(
    'services',
    'duration_label',
    '`duration_label` VARCHAR(80) NULL AFTER `duration_minutes`',
  );
  await ensureColumn(
    'cleaners',
    'area',
    "`area` VARCHAR(120) NOT NULL DEFAULT 'Malang' AFTER `phone`",
  );
  await ensureColumn('cleaners', 'photo_url', '`photo_url` VARCHAR(500) NULL AFTER `area`');
  await ensureColumn('cleaners', 'skills', '`skills` TEXT NULL AFTER `photo_url`');
  await ensureColumn(
    'promos',
    'scope',
    "`scope` ENUM('all','services') NOT NULL DEFAULT 'all' AFTER `is_active`",
  );
  await ensureColumn(
    'promos',
    'service_ids',
    '`service_ids` TEXT NULL AFTER `scope`',
  );
  await ensureColumn(
    'promos',
    'per_customer_limit',
    '`per_customer_limit` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `service_ids`',
  );
  await ensureColumn(
    'promos',
    'stackable',
    '`stackable` BOOLEAN NOT NULL DEFAULT FALSE AFTER `per_customer_limit`',
  );
  await ensureColumn(
    'bookings',
    'hold_until',
    '`hold_until` DATETIME NULL AFTER `status`',
  );
  await ensureColumn(
    'bookings',
    'service_duration_minutes',
    '`service_duration_minutes` SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER `service_price`',
  );
  await connection.query(
    `UPDATE cleango.bookings b
     INNER JOIN cleango.services s ON s.id = b.service_id
     SET b.service_duration_minutes = s.duration_minutes
     WHERE b.service_duration_minutes = 0`,
  );
  if (schemaOnly) {
    console.log(
      'Schema Putra diterapkan ke cleango lokal tanpa seeder; data lama dipertahankan.',
    );
  } else {
    await connection.query(sql);
    const [rows] = await connection.query(
      `SELECT email, role, is_active AS isActive
     FROM cleango.users
     WHERE email = ?
     LIMIT 1`,
      ['admin@cleango.id'],
    );

    if (!rows[0] || rows[0].role !== 'admin' || !rows[0].isActive) {
      throw new Error('Seed admin CleanGo tidak berhasil diverifikasi');
    }

    console.log('Database CleanGo siap; akun admin dummy aktif.');
  }
} finally {
  await connection.end();
}
