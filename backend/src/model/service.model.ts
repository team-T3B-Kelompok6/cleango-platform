import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';

export interface Service extends RowDataPacket {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
  imageUrl: string | null;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceInclusion extends RowDataPacket {
  id: number;
  description: string;
  sortOrder: number;
}

export interface ServiceInput {
  categoryId: number;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
  imageUrl: string | null;
  isActive: boolean;
}

export interface ServiceFilters {
  search: string | null;
  categoryId: number | null;
  activeOnly: boolean;
}

export async function findServices(filters: ServiceFilters): Promise<Service[]> {
  const [rows] = await pool.query<Service[]>(
    `SELECT s.id, s.category_id AS categoryId, c.name AS categoryName,
            s.name, s.description, s.price,
            s.duration_minutes AS durationMinutes,
            s.image_url AS imageUrl, s.is_active AS isActive,
            s.created_at AS createdAt, s.updated_at AS updatedAt
     FROM services s
     INNER JOIN categories c ON c.id = s.category_id
     WHERE (? = 0 OR (s.is_active = 1 AND c.is_active = 1))
       AND (? IS NULL OR s.name LIKE CONCAT('%', ?, '%'))
       AND (? IS NULL OR s.category_id = ?)
     ORDER BY s.name ASC`,
    [
      filters.activeOnly ? 1 : 0,
      filters.search, filters.search,
      filters.categoryId, filters.categoryId,
    ],
  );
  return rows;
}

export async function findServiceById(id: number, activeOnly: boolean): Promise<Service | null> {
  const [rows] = await pool.query<Service[]>(
    `SELECT s.id, s.category_id AS categoryId, c.name AS categoryName,
            s.name, s.description, s.price,
            s.duration_minutes AS durationMinutes,
            s.image_url AS imageUrl, s.is_active AS isActive,
            s.created_at AS createdAt, s.updated_at AS updatedAt
     FROM services s
     INNER JOIN categories c ON c.id = s.category_id
     WHERE s.id = ? AND (? = 0 OR (s.is_active = 1 AND c.is_active = 1))
     LIMIT 1`,
    [id, activeOnly ? 1 : 0],
  );
  return rows[0] ?? null;
}

export async function findServiceInclusions(serviceId: number): Promise<ServiceInclusion[]> {
  const [rows] = await pool.query<ServiceInclusion[]>(
    `SELECT id, description, sort_order AS sortOrder
     FROM service_inclusions
     WHERE service_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [serviceId],
  );
  return rows;
}

export async function insertService(input: ServiceInput): Promise<Service> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO services
       (category_id, name, description, price, duration_minutes, image_url, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.categoryId, input.name, input.description, input.price,
      input.durationMinutes, input.imageUrl, input.isActive,
    ],
  );
  const service = await findServiceById(result.insertId, false);
  if (!service) throw new Error('Layanan gagal dibaca setelah dibuat');
  return service;
}

export async function updateServiceById(
  id: number,
  input: Partial<ServiceInput>,
): Promise<Service | null> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE services SET
       category_id = IF(?, ?, category_id),
       name = IF(?, ?, name),
       description = IF(?, ?, description),
       price = IF(?, ?, price),
       duration_minutes = IF(?, ?, duration_minutes),
       image_url = IF(?, ?, image_url),
       is_active = IF(?, ?, is_active)
     WHERE id = ?`,
    [
      input.categoryId !== undefined, input.categoryId ?? 0,
      input.name !== undefined, input.name ?? '',
      input.description !== undefined, input.description ?? null,
      input.price !== undefined, input.price ?? 0,
      input.durationMinutes !== undefined, input.durationMinutes ?? 0,
      input.imageUrl !== undefined, input.imageUrl ?? null,
      input.isActive !== undefined, input.isActive ?? false,
      id,
    ],
  );
  if (result.affectedRows === 0) return null;
  return findServiceById(id, false);
}

export async function deleteServiceById(id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>('DELETE FROM services WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
