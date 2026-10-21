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

export type CategoryDeleteResult =
  | 'deleted'
  | 'not_found'
  | 'in_use_by_services'
  | 'in_use_by_orders';

/**
 * Deletes a service category. When [deleteServices] is set the services in that
 * category are removed too, but only if no booking references them (bookings
 * keep a foreign key to services).
 */
export async function deleteResourceCategoryById(
  id: number,
  options: { deleteServices?: boolean } = {},
): Promise<CategoryDeleteResult> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [serviceRows] = await connection.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM services WHERE category_id = ?',
      [id],
    );
    const serviceCount = Number(serviceRows[0]?.total ?? 0);

    if (serviceCount > 0 && !options.deleteServices) {
      await connection.rollback();
      return 'in_use_by_services';
    }

    if (serviceCount > 0) {
      const [bookedRows] = await connection.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM bookings b
         INNER JOIN services s ON s.id = b.service_id
         WHERE s.category_id = ?`,
        [id],
      );
      if (Number(bookedRows[0]?.total ?? 0) > 0) {
        await connection.rollback();
        return 'in_use_by_orders';
      }
      await connection.execute('DELETE FROM services WHERE category_id = ?', [id]);
    }

    const [result] = await connection.execute<ResultSetHeader>(
      'DELETE FROM service_categories WHERE id = ?',
      [id],
    );
    await connection.commit();
    return result.affectedRows > 0 ? 'deleted' : 'not_found';
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
