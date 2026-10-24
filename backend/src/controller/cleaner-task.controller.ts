import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { RowDataPacket } from 'mysql2';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import { pool } from '../lib/db.js';
import {
  assertUsable,
  createLinkToken,
  deletePhoto,
  findAssignmentByTokenHash,
  findPhoto,
  hashToken,
  insertPhoto,
  linkExpiresAt,
  listActiveAssignments,
  listPhotos,
  revokeAssignment,
  rotateLink,
  saveLocation,
  saveStage,
  stageOf,
  syncBookingStatus,
  touchLocationSharing,
  type TaskPhotoRow,
  type TaskRow,
  type TaskStage,
} from '../model/cleaner-task.model.js';
import { positiveId } from './resource-validation.js';

const UPLOAD_DIR = process.env.CLEANER_UPLOAD_DIR || 'uploads/cleaner';
const MAX_BYTES = 2_000_000;
const ALLOWED: Record<string, 'image/png' | 'image/jpeg'> = {
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
};

function linkDelivery(linkStatus: string, expiresAt: Date) {
  const expired = new Date(expiresAt).getTime() <= Date.now();
  const status = expired ? 'expired' : linkStatus;
  if (status === 'revoked')
    return { status: 'manual_ready' as const, mode: 'manual' as const, attempts: 0, message: 'Tautan dicabut, minta link baru.' };
  if (status === 'expired')
    return { status: 'failed' as const, mode: 'manual' as const, attempts: 1, message: 'Tautan kedaluwarsa, minta link baru.' };
  return { status: 'manual_ready' as const, mode: 'manual' as const, attempts: 1, draftUrl: undefined };
}

export function publicTask(row: TaskRow, photos: { id: string; mimeType: string }[]) {
  const stage = stageOf(row);
  const report = row.summary
    ? { summary: row.summary, checked: row.reportChecked === 1 }
    : undefined;
  const location =
    row.locationSharingStartedAt !== null
      ? undefined
      : undefined;
  return {
    id: String(row.assignmentId),
    orderId: String(row.bookingId),
    staffId: String(row.cleanerId),
    staffName: row.staffName,
    customer: row.customerName,
    customerPhone: row.customerPhone ?? '',
    address: row.address ?? '',
    date: row.orderDate,
    time: row.orderTime,
    service: row.serviceName,
    notes: row.notes ?? '',
    orderStatus: row.orderStatus,
    stage,
    demo: false,
    departedAt: isoOrUndefined(row.departedAt),
    arrivedAt: isoOrUndefined(row.arrivedAt),
    startedAt: isoOrUndefined(row.startedAt),
    completedAt: isoOrUndefined(row.completedAt),
    updatedAt: new Date(row.updatedAt).toISOString(),
    expiresAt: new Date(row.linkExpiresAt).toISOString(),
    report,
    photos: photos.map((photo) => ({ id: photo.id, type: photo.mimeType })),
    linkDelivery: linkDelivery(row.linkStatus, row.linkExpiresAt),
    reportDelivery: {
      status: (row.completedAt ? 'manual_ready' : 'not_sent') as 'manual_ready' | 'not_sent',
      mode: 'manual' as const,
      attempts: row.completedAt ? 1 : 0,
    },
    location,
  };
}

function isoOrUndefined(value: Date | null): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

async function taskByToken(token: string): Promise<TaskRow> {
  const row = await findAssignmentByTokenHash(hashToken(token));
  if (!row)
    throw new AppError(404, 'Link tugas tidak tersedia.', 'TASK_NOT_FOUND');
  assertUsable(row);
  return row;
}

export async function getCleanerTask(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = bearerToken(request);
    const row = await taskByToken(token);
    const photos = await listPhotos(row.assignmentId);
    response.status(200).json({ data: publicTask(row, photos) });
  } catch (error) {
    next(error);
  }
}

export async function postCleanerEvent(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const key = request.header('idempotency-key');
    if (!key || !/^[a-zA-Z0-9_-]{8,100}$/.test(key))
      throw new AppError(400, 'ID tindakan tidak valid. Muat ulang halaman.', 'VALIDATION_ERROR');

    const token = bearerToken(request);
    const row = await taskByToken(token);
    const body = request.body as Record<string, unknown>;
    const kind = typeof body.kind === 'string' ? body.kind : '';
    const current = stageOf(row);

    if (kind === 'location') {
      const latitude = Number(body.latitude);
      const longitude = Number(body.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
        throw new AppError(400, 'Lokasi tidak valid.', 'VALIDATION_ERROR');
      await touchLocationSharing(row.assignmentId);
      await saveLocation(row.assignmentId, latitude, longitude);
    } else if (kind === 'depart') {
      await advance(row, current, 'en_route');
    } else if (kind === 'arrive') {
      if (current === 'assigned')
        await advance(row, current, 'en_route');
      await advance(row, 'en_route', 'working');
    } else if (kind === 'complete') {
      if (current === 'assigned') await advance(row, current, 'en_route');
      if (current !== 'working') await advance(row, 'en_route', 'working');
      const summary = typeof body.summary === 'string' ? body.summary.trim() : '';
      if (!summary) throw new AppError(400, 'Laporan kerja wajib diisi.', 'VALIDATION_ERROR');
      await saveStage(row.assignmentId, 'completed', summary, body.checked === true);
      await syncBookingStatus(row.bookingId, 'completed');
    } else if (kind === 'remove_photo') {
      const photoId = typeof body.photoId === 'string' ? body.photoId : '';
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(photoId))
        throw new AppError(400, 'Foto tidak valid.', 'VALIDATION_ERROR');
      const removed = await deletePhoto(row.assignmentId, photoId);
      if (removed) await unlink(removed.storagePath).catch(() => undefined);
    } else if (kind === 'retry_report') {
      const refreshed = await findAssignmentByTokenHash(hashToken(token));
      if (!refreshed || !refreshed.completedAt)
        throw new AppError(400, 'Laporan belum tersedia.', 'VALIDATION_ERROR');
    } else {
      throw new AppError(400, 'Tindakan tidak dikenal.', 'VALIDATION_ERROR');
    }

    const updated = await findAssignmentByTokenHash(hashToken(token));
    if (!updated) throw new AppError(404, 'Link tugas tidak tersedia.', 'TASK_NOT_FOUND');
    const photos = await listPhotos(updated.assignmentId);
    response.status(200).json({ data: publicTask(updated, photos) });
  } catch (error) {
    next(error);
  }
}

async function advance(row: TaskRow, from: TaskStage, to: TaskStage): Promise<void> {
  const order: TaskStage[] = ['assigned', 'en_route', 'working', 'completed'];
  if (order.indexOf(to) <= order.indexOf(from)) return;
  await saveStage(row.assignmentId, to);
  await syncBookingStatus(row.bookingId, to);
}

export async function postCleanerPhoto(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = bearerToken(request);
    const row = await taskByToken(token);
    const bytes = request.body;
    if (!Buffer.isBuffer(bytes) || bytes.length === 0)
      throw new AppError(400, 'Pilih foto bukti kerja.', 'VALIDATION_ERROR');
    if (bytes.length > MAX_BYTES)
      throw new AppError(400, 'Ukuran foto melebihi 2 MB.', 'VALIDATION_ERROR');
    const mimeType = ALLOWED[request.header('content-type') ?? ''];
    if (!mimeType)
      throw new AppError(400, 'Format foto harus PNG atau JPEG.', 'VALIDATION_ERROR');

    await mkdir(UPLOAD_DIR, { recursive: true });
    const id = randomUUID();
    const storagePath = path.join(UPLOAD_DIR, id);
    await writeFile(storagePath, bytes);
    await insertPhoto(row.assignmentId, mimeType, storagePath);

    const updated = await findAssignmentByTokenHash(hashToken(token));
    if (!updated) throw new AppError(404, 'Link tugas tidak tersedia.', 'TASK_NOT_FOUND');
    const photos = await listPhotos(updated.assignmentId);
    response.status(200).json({ data: publicTask(updated, photos) });
  } catch (error) {
    next(error);
  }
}

export async function getCleanerPhoto(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = bearerToken(request);
    const row = await taskByToken(token);
    const photo = await findPhoto(String(request.params.id ?? ''));
    if (!photo || photo.assignmentId !== row.assignmentId)
      throw new AppError(404, 'Foto tidak tersedia.', 'PHOTO_NOT_FOUND');
    const bytes = await readFile(photo.storagePath);
    response.status(200).type(photo.mimeType).send(bytes);
  } catch (error) {
    next(error);
  }
}

export async function getAdminTaskBoard(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rows = await listActiveAssignments();
    const items = await Promise.all(
      rows.map(async (row) => ({
        orderId: String(row.bookingId),
        customer: row.customerName,
        staffName: row.staffName,
        staffId: String(row.cleanerId),
        service: row.serviceName,
        address: row.address ?? '',
        date: row.orderDate,
        time: row.orderTime,
        orderStatus: row.orderStatus,
        demo: false,
        startedAt: isoOrUndefined(row.startedAt),
        completedAt: isoOrUndefined(row.completedAt),
        linkDelivery: linkDelivery(row.linkStatus, row.linkExpiresAt),
      })),
    );
    response.status(200).json({
      data: { items, demoEnabled: false, publicOrigin: '' },
    });
  } catch (error) {
    next(error);
  }
}

export async function resendAdminLink(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = request.body as Record<string, unknown>;
    const orderId = positiveId(body.orderId, 'ID pesanan');
    const rows = await listActiveAssignments();
    const row = rows.find((item) => item.bookingId === orderId);
    if (!row)
      throw new AppError(404, 'Penugasan tidak ditemukan.', 'ASSIGNMENT_NOT_FOUND');
    const { token, expiresAt } = await rotateLink(row.assignmentId);
    response.status(200).json({
      data: { token, expiresAt: new Date(expiresAt).toISOString(), orderId: String(orderId) },
    });
  } catch (error) {
    next(error);
  }
}

export async function revokeOrderLink(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orderId = positiveId(request.params.id, 'ID pesanan');
    const rows = await listActiveAssignments();
    const row = rows.find((item) => item.bookingId === orderId);
    if (!row)
      throw new AppError(404, 'Penugasan tidak ditemukan.', 'ASSIGNMENT_NOT_FOUND');
    await revokeAssignment(row.assignmentId);
    response.status(200).json({ message: 'Tautan tugas dicabut.' });
  } catch (error) {
    next(error);
  }
}

export async function dispatchAssignment(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const bookingId = positiveId(request.params.id, 'ID pesanan');
    const body = request.body as Record<string, unknown>;
    const staffName = typeof body.staffName === 'string' ? body.staffName.trim() : '';
    if (!staffName)
      throw new AppError(400, 'Petugas wajib diisi.', 'VALIDATION_ERROR');

    const token = createLinkToken();
    const [cleaners] = await pool.query<RowDataPacket[]>(
      'SELECT id, name FROM cleaners WHERE name = ? LIMIT 1',
      [staffName],
    );
    if (!cleaners[0])
      throw new AppError(400, 'Petugas tidak ditemukan.', 'VALIDATION_ERROR');

    const adminId = request.user?.id;
    if (!adminId) throw new AppError(401, 'Authentication diperlukan', 'AUTH_REQUIRED');
    const expiresAt = linkExpiresAt();
    await pool.execute(
      `INSERT INTO cleaner_assignments
         (booking_id, cleaner_id, assigned_by, link_token_hash, link_expires_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         cleaner_id = VALUES(cleaner_id),
         assigned_by = VALUES(assigned_by),
         assigned_at = NOW(),
         link_token_hash = VALUES(link_token_hash),
         link_expires_at = VALUES(link_expires_at),
         link_status = 'active'`,
      [bookingId, Number(cleaners[0].id), adminId, hashToken(token), expiresAt],
    );
    await syncBookingStatus(bookingId, 'assigned');
    response.status(200).json({
      message: 'Petugas ditugaskan.',
      data: { orderId: String(bookingId), staffName, token, expiresAt: new Date(expiresAt).toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

function bearerToken(request: Request): string {
  const header = request.header('authorization');
  const match = header?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) throw new AppError(401, 'Link tugas tidak berlaku.', 'TASK_TOKEN_REQUIRED');
  return match[1].trim();
}