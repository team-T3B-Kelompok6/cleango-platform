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
