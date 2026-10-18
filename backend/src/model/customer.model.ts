import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  joined: string;
  active: boolean;
  orderCount?: number;
  totalSpent?: number;
  area?: string | undefined;
}

interface CustomerRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  isActive: number;
  createdAt: Date;
  address: string | null;
  city: string | null;
  orderCount: number;
  totalSpent: number;
}

const SELECT = `SELECT u.id, u.name, u.email, u.phone, u.is_active AS isActive, u.created_at AS createdAt,
  a.street_address AS address, a.city,
  COALESCE(b.orderCount, 0) AS orderCount, COALESCE(b.totalSpent, 0) AS totalSpent
  FROM users u
  LEFT JOIN addresses a ON a.user_id = u.id AND a.is_primary = TRUE
  LEFT JOIN (
    SELECT customer_id AS customerId, COUNT(*) AS orderCount, COALESCE(SUM(total_amount), 0) AS totalSpent
    FROM bookings GROUP BY customer_id
  ) b ON b.customerId = u.id
  WHERE u.role = 'customer'`;

export async function listCustomers(): Promise<Customer[]> {
  const [rows] = await pool.query<CustomerRow[]>(`${SELECT} ORDER BY u.created_at DESC, u.id DESC`);
  return rows.map(mapCustomer);
}

export async function findCustomer(id: number): Promise<Customer | null> {
  const [rows] = await pool.query<CustomerRow[]>(`${SELECT} AND u.id = ? LIMIT 1`, [id]);
  return rows[0] ? mapCustomer(rows[0]) : null;
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: String(row.id),
    name: row.name,
    phone: row.phone ?? '',
    email: row.email,
    address: row.address ?? '',
    joined: row.createdAt.toISOString().slice(0, 10),
    active: Boolean(row.isActive),
    orderCount: Number(row.orderCount ?? 0),
    totalSpent: Number(row.totalSpent ?? 0),
    area: (row.city ?? undefined) as string | undefined,
  };
}

export async function updateCustomerById(
  id: number,
  input: { name?: string; phone?: string; email?: string; active?: boolean },
): Promise<Customer | null> {
  const existing = await findCustomer(id);
  if (!existing) return null;
  const fields: string[] = [];
  const values: (string | number | boolean | null)[] = [];
  if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
  if (input.phone !== undefined) { fields.push('phone = ?'); values.push(input.phone || null); }
  if (input.email !== undefined) { fields.push('email = ?'); values.push(input.email); }
  if (input.active !== undefined) { fields.push('is_active = ?'); values.push(input.active); }
  if (fields.length) {
    values.push(id);
    await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ? AND role = 'customer'`, values);
  }
  return findCustomer(id);
}

export async function deleteCustomerById(id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    "DELETE FROM users WHERE id = ? AND role = 'customer'",
    [id],
  );
  return result.affectedRows > 0;
}
