import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';
import { AppError } from '../lib/AppError.js';

export type TaskStage = 'assigned' | 'en_route' | 'working' | 'completed';
export type LinkStatus = 'active' | 'expired' | 'revoked' | 'completed';

const LINK_VALID_DAYS = 7;

export const linkExpiresAt = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() + LINK_VALID_DAYS);
  return date;
};

export interface TaskRow extends RowDataPacket {
  assignmentId: number;
  bookingId: number;
  customerId: number;
  cleanerId: number;
  linkStatus: LinkStatus;
  linkExpiresAt: Date;
  departedAt: Date | null;
  arrivedAt: Date | null;
  startedAt: Date | number | null;
  completedAt: Date | null;
  updatedAt: Date;
  orderStatus: string;
  customerName: string;
  customerPhone: string | null;
  address: string | null;
  serviceName: string;
  serviceDurationMinutes: number;
  staffName: string;
  orderDate: string;
  orderTime: string;
  notes: string | null;
  locationSharingStartedAt: Date | null;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: number | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  summary: string | null;
  reportChecked: number | null;
}

const TASK_SELECT = `SELECT ca.id AS assignmentId, b.id AS bookingId, b.customer_id AS customerId,
  ca.cleaner_id AS cleanerId, ca.link_status AS linkStatus, ca.link_expires_at AS linkExpiresAt,
  ca.updated_at AS updatedAt,
  b.status AS orderStatus, u.name AS customerName, u.phone AS customerPhone,
  CONCAT_WS(', ', a.street_address, a.city, a.province) AS address,
  s.name AS serviceName, s.duration_minutes AS serviceDurationMinutes,
  cl.name AS staffName, DATE_FORMAT(b.scheduled_date, '%Y-%m-%d') AS orderDate,
  TIME_FORMAT(b.scheduled_start_time, '%H:%i') AS orderTime,
  COALESCE(b.customer_notes, '') AS notes,
  ca.location_sharing_started_at AS locationSharingStartedAt,
  bs.departed_at AS departedAt, bs.arrived_at AS arrivedAt,
  UNIX_TIMESTAMP(bs.started_at) * 1000 AS startedAt, bs.completed_at AS completedAt,
  bs.summary, bs.report_checked AS reportChecked,
  bs.latitude, bs.longitude,
  UNIX_TIMESTAMP(bs.location_updated_at) * 1000 AS locationUpdatedAt,
  a.latitude AS destinationLatitude, a.longitude AS destinationLongitude
  FROM cleaner_assignments ca
  INNER JOIN bookings b ON b.id = ca.booking_id
  INNER JOIN users u ON u.id = b.customer_id
  INNER JOIN services s ON s.id = b.service_id
  INNER JOIN cleaners cl ON cl.id = ca.cleaner_id
  LEFT JOIN addresses a ON a.id = b.address_id
  LEFT JOIN cleaner_task_stages bs ON bs.assignment_id = ca.id
  WHERE ca.link_token_hash = ?
  LIMIT 1`;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createLinkToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function findAssignmentByTokenHash(
  hash: string,
): Promise<TaskRow | null> {
  const [rows] = await pool.query<TaskRow[]>(TASK_SELECT, [hash]);
  return rows[0] ?? null;
}

export async function listActiveAssignments(): Promise<TaskRow[]> {
  const [rows] = await pool.query<TaskRow[]>(
    `${TASK_SELECT.replace('WHERE ca.link_token_hash = ?', '').replace('LIMIT 1', '')}
     ORDER BY ca.assigned_at DESC LIMIT 200`,
  );
  return rows;
}

export async function findCustomerTask(
  customerId: number,
  bookingId: number,
): Promise<TaskRow | null> {
  const [rows] = await pool.query<TaskRow[]>(
    TASK_SELECT.replace(
      'WHERE ca.link_token_hash = ?',
      'WHERE b.customer_id = ? AND b.id = ?',
    ),
    [customerId, bookingId],
  );
  return rows[0] ?? null;
}

export function stageOf(row: TaskRow): TaskStage {
  if (row.completedAt) return 'completed';
  if (row.startedAt) return 'working';
  if (row.departedAt || row.orderStatus === 'en_route') return 'en_route';
  return 'assigned';
}

const STAGE_STATUS: Record<TaskStage, string> = {
  assigned: 'assigned',
  en_route: 'en_route',
  working: 'in_progress',
  completed: 'completed',
};

const STAGE_COLUMNS: Record<TaskStage, string | null> = {
  assigned: null,
  en_route: 'departed_at',
  working: 'started_at',
  completed: 'completed_at',
};

export async function saveStage(
  assignmentId: number,
  stage: TaskStage,
  summary?: string,
  checked?: boolean,
): Promise<void> {
  const column = STAGE_COLUMNS[stage];
  if (!column) return;
  const sets = [`${column} = COALESCE(${column}, NOW())`, 'updated_at = NOW()'];
  const values: (string | number | null)[] = [];
  if (summary !== undefined) {
    sets.push('summary = ?');
    values.push(summary);
  }
  if (checked !== undefined) {
    sets.push('report_checked = ?');
    values.push(checked ? 1 : 0);
  }
  await pool.execute(
    `INSERT INTO cleaner_task_stages (assignment_id, ${column})
     VALUES (?, NOW())
     ON DUPLICATE KEY UPDATE ${sets.join(', ')}`,
    [assignmentId, ...values],
  );
}

export async function syncBookingStatus(
  bookingId: number,
  stage: TaskStage,
): Promise<void> {
  await pool.execute(
    `UPDATE bookings SET status = ?,
       completed_at = CASE WHEN ? = 'completed' AND completed_at IS NULL THEN NOW() ELSE completed_at END
     WHERE id = ?`,
    [STAGE_STATUS[stage], stage, bookingId],
  );
}

export async function rotateLink(
  assignmentId: number,
): Promise<{ token: string; expiresAt: Date }> {
  const token = createLinkToken();
  const expiresAt = linkExpiresAt();
  await pool.execute(
    `UPDATE cleaner_assignments
     SET link_token_hash = ?, link_expires_at = ?, link_status = 'active'
     WHERE id = ?`,
    [hashToken(token), expiresAt, assignmentId],
  );
  return { token, expiresAt };
}

export async function touchLocationSharing(
  assignmentId: number,
): Promise<void> {
  await pool.execute(
    `UPDATE cleaner_assignments
     SET location_sharing_started_at = COALESCE(location_sharing_started_at, NOW())
     WHERE id = ?`,
    [assignmentId],
  );
}

export async function saveLocation(
  assignmentId: number,
  latitude: number,
  longitude: number,
): Promise<void> {
  await pool.execute(
    `INSERT INTO cleaner_task_stages
       (assignment_id, latitude, longitude, location_updated_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       latitude = VALUES(latitude),
       longitude = VALUES(longitude),
       location_updated_at = NOW()`,
    [assignmentId, latitude, longitude],
  );
}

export interface TaskPhotoRow extends RowDataPacket {
  id: string;
  assignmentId: number;
  mimeType: 'image/png' | 'image/jpeg';
  storagePath: string;
}

export async function listPhotos(
  assignmentId: number,
): Promise<{ id: string; mimeType: string }[]> {
  const [rows] = await pool.query<TaskPhotoRow[]>(
    `SELECT id, assignment_id AS assignmentId, mime_type AS mimeType, storage_path AS storagePath
     FROM cleaner_task_photos WHERE assignment_id = ? ORDER BY created_at ASC LIMIT 3`,
    [assignmentId],
  );
  return rows;
}

export async function insertPhoto(
  assignmentId: number,
  mimeType: 'image/png' | 'image/jpeg',
  storagePath: string,
): Promise<{ id: string }> {
  const id = randomUUID();
  await pool.execute(
    'INSERT INTO cleaner_task_photos (id, assignment_id, mime_type, storage_path) VALUES (?, ?, ?, ?)',
    [id, assignmentId, mimeType, storagePath],
  );
  return { id };
}

export async function deletePhoto(
  assignmentId: number,
  photoId: string,
): Promise<TaskPhotoRow | null> {
  const [rows] = await pool.query<TaskPhotoRow[]>(
    `SELECT id, assignment_id AS assignmentId, mime_type AS mimeType, storage_path AS storagePath
     FROM cleaner_task_photos WHERE id = ? AND assignment_id = ? LIMIT 1`,
    [photoId, assignmentId],
  );
  if (!rows[0]) return null;
  await pool.execute(
    'DELETE FROM cleaner_task_photos WHERE id = ? AND assignment_id = ?',
    [photoId, assignmentId],
  );
  return rows[0];
}

export async function findPhoto(photoId: string): Promise<TaskPhotoRow | null> {
  const [rows] = await pool.query<TaskPhotoRow[]>(
    `SELECT id, assignment_id AS assignmentId, mime_type AS mimeType, storage_path AS storagePath
     FROM cleaner_task_photos WHERE id = ? LIMIT 1`,
    [photoId],
  );
  return rows[0] ?? null;
}

export async function revokeAssignment(assignmentId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE cleaner_assignments SET link_status = 'revoked' WHERE id = ?`,
    [assignmentId],
  );
  return result.affectedRows > 0;
}

export function assertUsable(row: TaskRow): void {
  if (row.linkStatus === 'revoked')
    throw new AppError(
      410,
      'Link tugas sudah tidak berlaku. Minta link baru kepada admin.',
    );
  if (
    row.linkStatus === 'expired' ||
    new Date(row.linkExpiresAt).getTime() <= Date.now()
  )
    throw new AppError(
      410,
      'Link tugas sudah kedaluwarsa. Minta link baru kepada admin.',
    );
}
