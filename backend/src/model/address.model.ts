import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';

export const MAX_ADDRESSES_PER_CUSTOMER = 5;

export interface Address extends RowDataPacket {
  id: number;
  userId: number;
  label: string;
  recipientName: string;
  recipientPhone: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddressInput {
  label: string;
  recipientName: string;
  recipientPhone: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
}

const ADDRESS_COLUMNS = `id, user_id AS userId, label,
  recipient_name AS recipientName, recipient_phone AS recipientPhone,
  street_address AS streetAddress, city, province,
  postal_code AS postalCode, landmark,
  latitude, longitude, is_primary AS isPrimary,
  created_at AS createdAt, updated_at AS updatedAt`;

export async function findAddressesByUser(userId: number): Promise<Address[]> {
  const [rows] = await pool.query<Address[]>(
    `SELECT ${ADDRESS_COLUMNS} FROM addresses
     WHERE user_id = ?
     ORDER BY is_primary DESC, created_at ASC, id ASC`,
    [userId],
  );
  return rows;
}

export async function findAddressById(id: number, userId: number): Promise<Address | null> {
  const [rows] = await pool.query<Address[]>(
    `SELECT ${ADDRESS_COLUMNS} FROM addresses WHERE id = ? AND user_id = ? LIMIT 1`,
    [id, userId],
  );
  return rows[0] ?? null;
}

export async function countAddressesByUser(userId: number): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM addresses WHERE user_id = ?',
    [userId],
  );
  return Number(rows[0]?.total ?? 0);
}

export async function insertAddress(userId: number, input: AddressInput): Promise<Address> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (input.isPrimary) {
      await connection.execute('UPDATE addresses SET is_primary = FALSE WHERE user_id = ?', [userId]);
    } else {
      const [countRows] = await connection.query<RowDataPacket[]>(
        'SELECT COUNT(*) AS total FROM addresses WHERE user_id = ? FOR UPDATE',
        [userId],
      );
      if (Number(countRows[0]?.total ?? 0) === 0) input.isPrimary = true;
    }
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO addresses
         (user_id, label, recipient_name, recipient_phone, street_address,
          city, province, postal_code, landmark, latitude, longitude, is_primary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, input.label, input.recipientName, input.recipientPhone, input.streetAddress,
        input.city, input.province, input.postalCode, input.landmark,
        input.latitude, input.longitude, input.isPrimary,
      ],
    );
    await connection.commit();
    const address = await findAddressById(result.insertId, userId);
    if (!address) throw new Error('Alamat gagal dibaca setelah dibuat');
    return address;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateAddressById(
  id: number,
  userId: number,
  input: Partial<AddressInput>,
): Promise<Address | null> {
  const existing = await findAddressById(id, userId);
  if (!existing) return null;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (input.isPrimary === true) {
      await connection.execute('UPDATE addresses SET is_primary = FALSE WHERE user_id = ? AND id <> ?', [userId, id]);
    }
    await connection.execute(
      `UPDATE addresses SET
         label = ?, recipient_name = ?, recipient_phone = ?, street_address = ?,
         city = ?, province = ?, postal_code = ?, landmark = ?,
         latitude = ?, longitude = ?, is_primary = ?
       WHERE id = ? AND user_id = ?`,
      [
        input.label ?? existing.label,
        input.recipientName ?? existing.recipientName,
        input.recipientPhone ?? existing.recipientPhone,
        input.streetAddress ?? existing.streetAddress,
        input.city ?? existing.city,
        input.province ?? existing.province,
        input.postalCode === undefined ? existing.postalCode : input.postalCode,
        input.landmark === undefined ? existing.landmark : input.landmark,
        input.latitude === undefined ? existing.latitude : input.latitude,
        input.longitude === undefined ? existing.longitude : input.longitude,
        input.isPrimary ?? existing.isPrimary,
        id, userId,
      ],
    );
    if (input.isPrimary === false) {
      const [rows] = await connection.query<RowDataPacket[]>(
        'SELECT COUNT(*) AS total FROM addresses WHERE user_id = ? AND is_primary = TRUE',
        [userId],
      );
      if (Number(rows[0]?.total ?? 0) === 0) {
        await connection.execute(
          'UPDATE addresses SET is_primary = TRUE WHERE user_id = ? ORDER BY id ASC LIMIT 1',
          [userId],
        );
      }
    }
    await connection.commit();
    return findAddressById(id, userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteAddressById(id: number, userId: number): Promise<boolean> {
  const existing = await findAddressById(id, userId);
  if (!existing) return false;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('DELETE FROM addresses WHERE id = ? AND user_id = ?', [id, userId]);
    if (existing.isPrimary) {
      await connection.execute(
        'UPDATE addresses SET is_primary = TRUE WHERE user_id = ? ORDER BY id ASC LIMIT 1',
        [userId],
      );
    }
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
