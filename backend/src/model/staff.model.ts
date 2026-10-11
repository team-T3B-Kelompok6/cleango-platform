import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';

export type StaffStatus =
  'Tersedia' | 'Bertugas' | 'Masa Training' | 'Nonaktif';
export interface StaffInput {
  name: string;
  phone: string;
  area: string;
  status: StaffStatus;
}
interface StaffRow extends RowDataPacket {
  id: number;
  name: string;
  phone: string;
  area: string;
  databaseStatus: 'available' | 'busy' | 'offline';
  active: number;
  rating: number;
}
export interface Staff {
  id: string;
  name: string;
  phone: string;
  area: string;
  status: StaffStatus;
  rating: number;
}

function apiStatus(row: StaffRow): StaffStatus {
  if (!row.active) return 'Nonaktif';
  if (row.databaseStatus === 'available') return 'Tersedia';
  if (row.databaseStatus === 'busy') return 'Bertugas';
  return 'Masa Training';
}
function databaseStatus(status: StaffStatus): {
  status: 'available' | 'busy' | 'offline';
  active: boolean;
} {
  if (status === 'Tersedia') return { status: 'available', active: true };
  if (status === 'Bertugas') return { status: 'busy', active: true };
  if (status === 'Masa Training') return { status: 'offline', active: true };
  return { status: 'offline', active: false };
}
function mapStaff(row: StaffRow): Staff {
  return {
    id: String(row.id),
    name: row.name,
    phone: row.phone,
    area: row.area,
    status: apiStatus(row),
    rating: row.rating,
  };
}
const select = `SELECT id, name, phone, area, status AS databaseStatus, is_active AS active, average_rating AS rating FROM cleaners`;
export async function listStaff(): Promise<Staff[]> {
  const [rows] = await pool.query<StaffRow[]>(`${select} ORDER BY name`);
  return rows.map(mapStaff);
}
export async function findStaff(id: number): Promise<Staff | null> {
  const [rows] = await pool.query<StaffRow[]>(
    `${select} WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ? mapStaff(rows[0]) : null;
}
export async function insertStaff(input: StaffInput): Promise<Staff> {
  const mapped = databaseStatus(input.status);
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO cleaners (name, phone, area, status, is_active) VALUES (?, ?, ?, ?, ?)',
    [input.name, input.phone, input.area, mapped.status, mapped.active],
  );
  const staff = await findStaff(result.insertId);
  if (!staff) throw new Error('Petugas gagal dibaca setelah dibuat');
  return staff;
}
export async function updateStaffById(
  id: number,
  input: Partial<StaffInput>,
): Promise<Staff | null> {
  const mapped =
    input.status === undefined ? null : databaseStatus(input.status);
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE cleaners SET name = IF(?, ?, name), phone = IF(?, ?, phone), area = IF(?, ?, area),
     status = IF(?, ?, status), is_active = IF(?, ?, is_active) WHERE id = ?`,
    [
      input.name !== undefined,
      input.name ?? '',
      input.phone !== undefined,
      input.phone ?? '',
      input.area !== undefined,
      input.area ?? '',
      mapped !== null,
      mapped?.status ?? 'offline',
      mapped !== null,
      mapped?.active ?? false,
      id,
    ],
  );
  if (result.affectedRows === 0) return null;
  return findStaff(id);
}
export async function deleteStaffById(id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM cleaners WHERE id = ?',
    [id],
  );
  return result.affectedRows > 0;
}
