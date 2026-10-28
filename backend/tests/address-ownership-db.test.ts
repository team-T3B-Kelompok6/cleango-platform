import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import 'dotenv/config';
import mysql from 'mysql2/promise';
import type { ResultSetHeader } from 'mysql2';

const enabled = process.env.DB_NAME === 'cleango' && process.env.RUN_DB_TESTS === '1';
const suite = enabled ? describe : describe.skip;

suite('address ownership against real cleango DB (RUN_DB_TESTS=1)', () => {
  let db: mysql.Connection;
  const ids: number[] = [];
  let owner = 0;
  let other = 0;
  let addressId = 0;

  const input = (label: string, isPrimary = false) => ({
    label,
    recipientName: 'Uji',
    recipientPhone: '081200000000',
    streetAddress: 'Jl. Uji 1',
    city: 'Malang',
    province: 'Jawa Timur',
    postalCode: null,
    landmark: null,
    latitude: null,
    longitude: null,
    isPrimary,
  });

  beforeAll(async () => {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'cleango',
    });
    for (const tag of ['owner', 'other']) {
      const [r] = await db.execute<ResultSetHeader>(
        `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, 'x', 'customer')`,
        [`uji-${tag}`, `uji-${tag}-${Date.now()}@test.local`],
      );
      ids.push(Number(r.insertId));
    }
    [owner, other] = ids;
  });

  afterAll(async () => {
    if (db) {
      await db.execute('DELETE FROM addresses WHERE user_id IN (?, ?)', [owner, other]);
      await db.execute('DELETE FROM users WHERE id IN (?, ?)', [owner, other]);
      await db.end();
    }
  });

  it('lets the owner create, read and update their own address', async () => {
    const { insertAddress, findAddressById, updateAddressById } = await import(
      '../src/model/address.model.js'
    );
    const created = await insertAddress(owner, input('Rumah', true));
    addressId = created.id;
    expect((await findAddressById(addressId, owner))?.label).toBe('Rumah');
    const updated = await updateAddressById(addressId, owner, { label: 'Kantor' });
    expect(updated?.label).toBe('Kantor');
  });

  it('hides another customer address on read, update and delete', async () => {
    const { findAddressById, updateAddressById, deleteAddressById } = await import(
      '../src/model/address.model.js'
    );
    expect(await findAddressById(addressId, other)).toBeNull();
    expect(await updateAddressById(addressId, other, { label: 'Curian' })).toBeNull();
    expect(await deleteAddressById(addressId, other)).toBe(false);
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      'SELECT label FROM addresses WHERE id = ?',
      [addressId],
    );
    expect(rows[0]?.label).toBe('Kantor');
  });
});
