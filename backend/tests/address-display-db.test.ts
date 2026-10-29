import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import 'dotenv/config';
import mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { addressSql } from '../src/lib/address-display.js';

const enabled = process.env.DB_NAME === 'cleango' && process.env.RUN_DB_TESTS === '1';
const suite = enabled ? describe : describe.skip;

suite('address display formatting against the database (RUN_DB_TESTS=1)', () => {
  let db: mysql.Connection;
  let userId = 0;
  const addresses: number[] = [];

  beforeAll(async () => {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'cleango',
    });
    const stamp = Date.now();
    const [user] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ('uji-address-display', ?, 'x', 'customer', TRUE)`,
      [`uji-address-display-${stamp}@test.local`],
    );
    userId = Number(user.insertId);
  });

  afterAll(async () => {
    if (db) {
      if (addresses.length)
        await db.query('DELETE FROM addresses WHERE id IN (?)', [addresses]);
      if (userId) await db.execute('DELETE FROM users WHERE id = ?', [userId]);
      await db.end();
    }
  });

  async function addAddress(
    street: string,
    city: string,
    province: string,
  ): Promise<number> {
    const [row] = await db.execute<ResultSetHeader>(
      `INSERT INTO addresses
         (user_id, label, recipient_name, recipient_phone, street_address, city, province, is_primary)
       VALUES (?, 'Uji', 'Uji', '081200000000', ?, ?, ?, FALSE)`,
      [userId, street, city, province],
    );
    addresses.push(Number(row.insertId));
    return Number(row.insertId);
  }

  async function display(id: number): Promise<string> {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT ${addressSql('a')} AS address FROM addresses a WHERE a.id = ?`,
      [id],
    );
    return String(rows[0]?.address ?? '');
  }

  it('does not duplicate city or province already present in the street', async () => {
    const full =
      'Jalan Depan Rektorat, Ketawanggede, Lowokwaru, Kota Malang, Jawa Timur, 65145, Indonesia';
    const id = await addAddress(full, 'Malang', 'Jawa Timur');
    expect(await display(id)).toBe(full);
  });

  it('appends city and province when the street is short', async () => {
    const id = await addAddress('Jl. Test No. 1', 'Malang', 'Jawa Timur');
    expect(await display(id)).toBe('Jl. Test No. 1, Malang, Jawa Timur');
  });

  it('does not add extra separators for blank city or province', async () => {
    const id = await addAddress('Jl. Tanpa Wilayah', '', '');
    expect(await display(id)).toBe('Jl. Tanpa Wilayah');
  });
});
