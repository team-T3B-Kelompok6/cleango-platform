import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { pool } from '../lib/db.js';

export type UserRole = 'customer' | 'admin';
export type AuthProvider = 'local' | 'google' | 'facebook';

export interface User extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  phone: string | null;
  role: UserRole;
  authProvider: AuthProvider;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const USER_COLUMNS = `id, name, email, password_hash AS passwordHash, phone, role,
            auth_provider AS authProvider, is_active AS isActive,
            created_at AS createdAt, updated_at AS updatedAt`;

export async function findUserByEmail(email: string): Promise<User | null> {
  const [rows] = await pool.query<User[]>(
    `SELECT ${USER_COLUMNS} FROM users WHERE email = ? LIMIT 1`,
    [email],
  );
  return rows[0] ?? null;
}

export async function findUserByPhone(phone: string): Promise<User | null> {
  const [rows] = await pool.query<User[]>(
    `SELECT ${USER_COLUMNS} FROM users WHERE phone = ? LIMIT 1`,
    [phone],
  );
  return rows[0] ?? null;
}

export async function findUserByIdentifier(identifier: string): Promise<User | null> {
  const clean = identifier.trim().toLowerCase();
  if (clean.includes('@')) {
    return findUserByEmail(clean);
  }
  return findUserByPhone(clean);
}

export async function findUserById(id: number): Promise<User | null> {
  const [rows] = await pool.query<User[]>(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
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
    `INSERT INTO users (name, email, password_hash, phone, role, auth_provider)
     VALUES (?, ?, ?, ?, 'customer', 'local')`,
    [input.name, input.email, input.passwordHash, input.phone],
  );
  const user = await findUserById(result.insertId);
  if (!user) throw new Error('User gagal dibaca setelah dibuat');
  return user;
}

export async function updateUserPassword(id: number, passwordHash: string): Promise<void> {
  await pool.execute(
    'UPDATE users SET password_hash = ? WHERE id = ?',
    [passwordHash, id],
  );
}

export async function findOrCreateSocialCustomer(input: {
  provider: AuthProvider;
  email: string;
  name: string;
}): Promise<User> {
  const existing = await findUserByEmail(input.email);
  if (existing) return existing;

  const randomPasswordHash = await bcrypt.hash(randomUUID(), 10);
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO users (name, email, password_hash, role, auth_provider)
     VALUES (?, ?, ?, 'customer', ?)`,
    [input.name, input.email, randomPasswordHash, input.provider],
  );
  const user = await findUserById(result.insertId);
  if (!user) throw new Error('User gagal dibaca setelah dibuat');
  return user;
}
