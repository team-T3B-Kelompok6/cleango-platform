import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';

export type UserRole = 'customer' | 'admin';

export interface User extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const [rows] = await pool.query<User[]>(
    `SELECT id, name, email, password_hash AS passwordHash, phone, role,
            is_active AS isActive,
            created_at AS createdAt, updated_at AS updatedAt
     FROM users WHERE email = ? LIMIT 1`,
    [email],
  );
  return rows[0] ?? null;
}

export async function findUserById(id: number): Promise<User | null> {
  const [rows] = await pool.query<User[]>(
    `SELECT id, name, email, password_hash AS passwordHash, phone, role,
            is_active AS isActive,
            created_at AS createdAt, updated_at AS updatedAt
     FROM users WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function insertCustomer(input: {
  name: string;
  email: string;
  passwordHash: string;
  phone: string | null;
}): Promise<User> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO users (name, email, password_hash, phone, role)
     VALUES (?, ?, ?, ?, 'customer')`,
    [input.name, input.email, input.passwordHash, input.phone],
  );
  const user = await findUserById(result.insertId);
  if (!user) throw new Error('User gagal dibaca setelah dibuat');
  return user;
}
