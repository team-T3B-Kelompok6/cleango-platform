import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';

const sql = await readFile(new URL('../database.sql', import.meta.url), 'utf8');
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
} finally {
  await connection.end();
}
