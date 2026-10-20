import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';
import { pool } from '../lib/db.js';

// Categories are managed in the `service_categories` table (admin dashboard can
// add new ones), so the API accepts any name instead of a hardcoded whitelist.
export type ServiceCategory = string;

export interface PlatformServiceInput {
  name: string;
  category: ServiceCategory;
  duration: string;
  durationMinutes: number;
  price: number;
  description: string;
  active: boolean;
  features: string[];
}

interface ServiceRow extends RowDataPacket {
  id: number;
  name: string;
  category: string;
  duration: string;
  price: number;
  description: string;
  active: number;
}

interface FeatureRow extends RowDataPacket {
  serviceId: number;
  description: string;
}

export interface PlatformService {
  id: string;
  name: string;
  category: ServiceCategory;
  duration: string;
  price: number;
  description: string;
  active: boolean;
  features: string[];
}

async function attachFeatures(rows: ServiceRow[]): Promise<PlatformService[]> {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const [features] = await pool.query<FeatureRow[]>(
    `SELECT service_id AS serviceId, description
     FROM service_inclusions
     WHERE service_id IN (?)
     ORDER BY service_id, sort_order, id`,
    [ids],
  );
  return rows.map((row) => ({
    id: String(row.id),
    name: row.name,
    category: row.category,
    duration: row.duration,
    price: row.price,
    description: row.description,
    active: Boolean(row.active),
    features: features
      .filter((feature) => feature.serviceId === row.id)
      .map((feature) => feature.description),
  }));
}

const serviceSelect = `SELECT s.id, s.name, c.name AS category,
  COALESCE(s.duration_label, CONCAT(s.duration_minutes, ' menit')) AS duration,
  s.price, COALESCE(s.description, '') AS description, s.is_active AS active
  FROM services s INNER JOIN service_categories c ON c.id = s.category_id`;

export type ServiceSort = 'name' | 'price' | 'category' | 'newest';
export const SERVICE_SORTS: ServiceSort[] = ['name', 'price', 'category', 'newest'];
const SORT_SQL: Record<ServiceSort, string> = {
  name: 's.name ASC',
  price: 's.price ASC, s.name ASC',
  category: 'c.name ASC, s.name ASC',
  newest: 's.created_at DESC, s.id DESC',
};

export interface PlatformServiceFilters {
  search?: string | null;
  category?: ServiceCategory | null;
  activeOnly?: boolean;
  sort?: ServiceSort;
}

export async function listPlatformServices(
  filters: PlatformServiceFilters = {},
): Promise<PlatformService[]> {
  const conditions: string[] = [];
  const values: (string | number)[] = [];
  if (filters.search) {
    conditions.push("(s.name LIKE ? OR COALESCE(s.description, '') LIKE ?)");
    values.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.category) {
    conditions.push('c.name = ?');
    values.push(filters.category);
  }
  if (filters.activeOnly) conditions.push('s.is_active = TRUE');
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  const order = SORT_SQL[filters.sort ?? 'name'];
  const [rows] = await pool.query<ServiceRow[]>(
    `${serviceSelect}${where} ORDER BY ${order}`,
    values,
  );
  return attachFeatures(rows);
}

export async function findPlatformService(
  id: number,
): Promise<PlatformService | null> {
  const [rows] = await pool.query<ServiceRow[]>(
    `${serviceSelect} WHERE s.id = ? LIMIT 1`,
    [id],
  );
  return (await attachFeatures(rows))[0] ?? null;
}

async function categoryId(
  connection: PoolConnection,
  category: ServiceCategory,
): Promise<number> {
  const [rows] = await connection.query<(RowDataPacket & { id: number })[]>(
    'SELECT id FROM service_categories WHERE name = ? AND is_active = TRUE LIMIT 1',
    [category],
  );
  if (!rows[0]) throw new Error('CATEGORY_NOT_FOUND');
  return rows[0].id;
}

async function replaceFeatures(
  connection: PoolConnection,
  serviceId: number,
  features: string[],
): Promise<void> {
  await connection.execute(
    'DELETE FROM service_inclusions WHERE service_id = ?',
    [serviceId],
  );
  for (const [index, feature] of features.entries()) {
    await connection.execute(
      'INSERT INTO service_inclusions (service_id, description, sort_order) VALUES (?, ?, ?)',
      [serviceId, feature, index + 1],
    );
  }
}

export async function insertPlatformService(
  input: PlatformServiceInput,
): Promise<PlatformService> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const resolvedCategoryId = await categoryId(connection, input.category);
    const slugBase =
      input.name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'layanan';
    const slug = `${slugBase}-${Date.now().toString(36)}`;
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO services
       (category_id, name, slug, description, price, duration_minutes, duration_label, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resolvedCategoryId,
        input.name,
        slug,
        input.description,
        input.price,
        input.durationMinutes,
        input.duration,
        input.active,
      ],
    );
    await replaceFeatures(connection, result.insertId, input.features);
    await connection.commit();
    const service = await findPlatformService(result.insertId);
    if (!service) throw new Error('Layanan gagal dibaca setelah dibuat');
    return service;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updatePlatformService(
  id: number,
  input: Partial<PlatformServiceInput>,
): Promise<PlatformService | null> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [exists] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM services WHERE id = ? LIMIT 1',
      [id],
    );
    if (!exists[0]) {
      await connection.rollback();
      return null;
    }
    const resolvedCategoryId =
      input.category === undefined
        ? null
        : await categoryId(connection, input.category);
    await connection.execute(
      `UPDATE services SET
       name = IF(?, ?, name), category_id = IF(?, ?, category_id),
       duration_label = IF(?, ?, duration_label), duration_minutes = IF(?, ?, duration_minutes),
       price = IF(?, ?, price), description = IF(?, ?, description), is_active = IF(?, ?, is_active)
       WHERE id = ?`,
      [
        input.name !== undefined,
        input.name ?? '',
        resolvedCategoryId !== null,
        resolvedCategoryId ?? 0,
        input.duration !== undefined,
        input.duration ?? '',
        input.durationMinutes !== undefined,
        input.durationMinutes ?? 0,
        input.price !== undefined,
        input.price ?? 0,
        input.description !== undefined,
        input.description ?? '',
        input.active !== undefined,
        input.active ?? false,
        id,
      ],
    );
    if (input.features !== undefined)
      await replaceFeatures(connection, id, input.features);
    await connection.commit();
    return findPlatformService(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deletePlatformService(id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM services WHERE id = ?',
    [id],
  );
  return result.affectedRows > 0;
}
