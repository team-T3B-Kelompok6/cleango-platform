import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';

export interface Category extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryInput {
  name: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
}

export async function findCategories(activeOnly: boolean): Promise<Category[]> {
  const [rows] = await pool.query<Category[]>(
    `SELECT id, name, description, icon_url AS icon,
            is_active AS isActive,
            created_at AS createdAt,
            updated_at AS updatedAt
     FROM service_categories
     WHERE (? = 0 OR is_active = 1)
     ORDER BY name ASC`,
    [activeOnly ? 1 : 0],
  );
  return rows;
}

export async function findCategoryById(
  id: number,
  activeOnly: boolean,
): Promise<Category | null> {
  const [rows] = await pool.query<Category[]>(
    `SELECT id, name, description, icon_url AS icon,
            is_active AS isActive,
            created_at AS createdAt,
            updated_at AS updatedAt
     FROM service_categories
     WHERE id = ? AND (? = 0 OR is_active = 1)
     LIMIT 1`,
    [id, activeOnly ? 1 : 0],
  );
  return rows[0] ?? null;
}

export async function insertCategory(input: CategoryInput): Promise<Category> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO service_categories (name, description, icon_url, is_active)
     VALUES (?, ?, ?, ?)`,
    [input.name, input.description, input.icon, input.isActive],
  );
  const category = await findCategoryById(result.insertId, false);
  if (!category) throw new Error('Kategori gagal dibaca setelah dibuat');
  return category;
}

export async function updateCategoryById(
  id: number,
  input: Partial<CategoryInput>,
): Promise<Category | null> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE service_categories SET
       name = IF(?, ?, name),
       description = IF(?, ?, description),
       icon_url = IF(?, ?, icon_url),
       is_active = IF(?, ?, is_active)
     WHERE id = ?`,
    [
      input.name !== undefined,
      input.name ?? '',
      input.description !== undefined,
      input.description ?? null,
      input.icon !== undefined,
      input.icon ?? null,
      input.isActive !== undefined,
      input.isActive ?? false,
      id,
    ],
  );
  if (result.affectedRows === 0) return null;
  return findCategoryById(id, false);
}

export async function deleteCategoryById(id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM service_categories WHERE id = ?',
    [id],
  );
  return result.affectedRows > 0;
}
