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

export async function findServices(
  filters: ServiceFilters,
): Promise<Service[]> {
  const [rows] = await pool.query<Service[]>(
    `SELECT s.id, s.category_id AS categoryId, c.name AS categoryName,
            s.name, s.description, s.price,
            s.duration_minutes AS durationMinutes,
            s.image_url AS imageUrl, s.is_active AS isActive,
            s.created_at AS createdAt, s.updated_at AS updatedAt
     FROM services s
     INNER JOIN service_categories c ON c.id = s.category_id
     WHERE (? = 0 OR (s.is_active = 1 AND c.is_active = 1))
       AND (? IS NULL OR s.name LIKE CONCAT('%', ?, '%'))
       AND (? IS NULL OR s.category_id = ?)
     ORDER BY s.name ASC`,
    [
      filters.activeOnly ? 1 : 0,
      filters.search,
      filters.search,
      filters.categoryId,
      filters.categoryId,
    ],
  );
  return rows;
}

export async function findServiceById(
  id: number,
  activeOnly: boolean,
): Promise<Service | null> {
  const [rows] = await pool.query<Service[]>(
    `SELECT s.id, s.category_id AS categoryId, c.name AS categoryName,
            s.name, s.description, s.price,
            s.duration_minutes AS durationMinutes,
            s.image_url AS imageUrl, s.is_active AS isActive,
            s.created_at AS createdAt, s.updated_at AS updatedAt
     FROM services s
     INNER JOIN service_categories c ON c.id = s.category_id
     WHERE s.id = ? AND (? = 0 OR (s.is_active = 1 AND c.is_active = 1))
     LIMIT 1`,
    [id, activeOnly ? 1 : 0],
  );
  return rows[0] ?? null;
}

export async function findServiceInclusions(
  serviceId: number,
): Promise<ServiceInclusion[]> {
  const [rows] = await pool.query<ServiceInclusion[]>(
    `SELECT id, description, sort_order AS sortOrder
     FROM service_inclusions
     WHERE service_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [serviceId],
  );
  return rows;
}

export interface ServiceReviewStats {
  rating: number | null;
  reviewCount: number;
  satisfactionPercentage: number;
}

export interface PublicServiceReview {
  id: string;
  name: string;
  avatarUrl: string | null;
  rating: number;
  comment: string;
  createdAt: string;
  photos: string[];
}

interface ServiceReviewRow extends RowDataPacket {
  id: number;
  name: string;
  avatarUrl: string | null;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export async function findServiceReviewStats(
  serviceId: number,
): Promise<ServiceReviewStats> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS reviewCount, AVG(r.rating) AS rating,
            ROUND(AVG(r.rating >= 4) * 100) AS satisfactionPercentage
     FROM reviews r
     INNER JOIN bookings b ON b.id = r.booking_id
     WHERE r.service_id = ? AND b.status = 'completed'`,
    [serviceId],
  );
  const row = rows[0];
  return {
    rating: row?.rating === null || row?.rating === undefined
      ? null
      : Number(row.rating),
    reviewCount: Number(row?.reviewCount ?? 0),
    satisfactionPercentage: Number(row?.satisfactionPercentage ?? 0),
  };
}

export async function listServiceReviews(
  serviceId: number,
  page: number,
  limit: number,
): Promise<PublicServiceReview[]> {
  const offset = (page - 1) * limit;
  const [rows] = await pool.execute<ServiceReviewRow[]>(
    `SELECT r.id, u.name, u.avatar_url AS avatarUrl, r.rating,
            r.comment, r.created_at AS createdAt
     FROM reviews r
     INNER JOIN users u ON u.id = r.customer_id
     INNER JOIN bookings b ON b.id = r.booking_id
     WHERE r.service_id = ? AND b.status = 'completed'
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT ? OFFSET ?`,
    [serviceId, limit, offset],
  );
  if (rows.length === 0) return [];

  const reviewIds = rows.map((row) => Number(row.id));
  const [photoRows] = await pool.query<RowDataPacket[]>(
    `SELECT review_id AS reviewId, photo_url AS url
     FROM review_photos
     WHERE review_id IN (?)
     ORDER BY sort_order ASC, id ASC`,
    [reviewIds],
  );
  const photos = new Map<number, string[]>();
  for (const photo of photoRows) {
    const reviewId = Number(photo.reviewId);
    const list = photos.get(reviewId) ?? [];
    list.push(String(photo.url));
    photos.set(reviewId, list);
  }

  return rows.map((row) => ({
    id: String(row.id),
    name: row.name,
    avatarUrl: row.avatarUrl ?? null,
    rating: Number(row.rating),
    comment: row.comment ?? '',
    createdAt: new Date(row.createdAt).toISOString(),
    photos: photos.get(Number(row.id)) ?? [],
  }));
}

export async function insertService(input: ServiceInput): Promise<Service> {
  const slug = `${
    input.name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'layanan'
  }-${Date.now().toString(36)}`;
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO services
       (category_id, name, slug, description, price, duration_minutes, image_url, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.categoryId,
      input.name,
      slug,
      input.description,
      input.price,
      input.durationMinutes,
      input.imageUrl,
      input.isActive,
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
      input.categoryId !== undefined,
      input.categoryId ?? 0,
      input.name !== undefined,
      input.name ?? '',
      input.description !== undefined,
      input.description ?? null,
      input.price !== undefined,
      input.price ?? 0,
      input.durationMinutes !== undefined,
      input.durationMinutes ?? 0,
      input.imageUrl !== undefined,
      input.imageUrl ?? null,
      input.isActive !== undefined,
      input.isActive ?? false,
      id,
    ],
  );
  if (result.affectedRows === 0) return null;
  return findServiceById(id, false);
}

export async function deleteServiceById(id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM services WHERE id = ?',
    [id],
  );
  return result.affectedRows > 0;
}
