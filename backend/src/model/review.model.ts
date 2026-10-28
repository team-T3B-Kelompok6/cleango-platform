import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';

export interface ReviewInput {
  rating: number;
  comment: string | null;
}

export type ReviewFailure = 'NOT_FOUND' | 'NOT_COMPLETED' | 'DUPLICATE' | 'WINDOW_CLOSED';

export type ReviewCreateResult =
  | { ok: true; id: number }
  | { ok: false; reason: ReviewFailure };

export type ReviewUpdateResult =
  | { ok: true }
  | { ok: false; reason: ReviewFailure | 'MISSING' };

export interface BookingReviewPhoto {
  id: string;
  url: string;
  sortOrder: number;
}

export interface BookingReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  editable: boolean;
  photos: BookingReviewPhoto[];
}

export type ReviewPhotoFailure = ReviewFailure | 'MISSING' | 'LIMIT_REACHED' | 'PHOTO_MISSING';

export type ReviewPhotoAddResult =
  | { ok: true; photo: BookingReviewPhoto }
  | { ok: false; reason: ReviewPhotoFailure };

export type ReviewPhotoDeleteResult =
  | { ok: true; url: string }
  | { ok: false; reason: ReviewPhotoFailure };

const REVIEW_WINDOW_DAYS = 7;
export const MAX_REVIEW_PHOTOS = 3;

interface BookingState extends RowDataPacket {
  id: number;
  customerId: number;
  serviceId: number;
  status: string;
  completedAt: Date | null;
  cleanerId: number | null;
  reviewId: number | null;
  rating: number | null;
  comment: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface ReviewPhotoRow extends RowDataPacket {
  id: number;
  url: string;
  sortOrder: number;
}

async function listReviewPhotos(
  reviewId: number,
  connection: { execute: typeof pool.execute } = pool,
): Promise<BookingReviewPhoto[]> {
  const [rows] = await connection.execute<ReviewPhotoRow[]>(
    `SELECT id, photo_url AS url, sort_order AS sortOrder
     FROM review_photos
     WHERE review_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [reviewId],
  );
  return rows.map((row) => ({
    id: String(row.id),
    url: row.url,
    sortOrder: Number(row.sortOrder),
  }));
}

async function loadBookingState(
  connection: { execute: typeof pool.execute },
  customerId: number,
  bookingId: number,
): Promise<BookingState | null> {
  const [rows] = await connection.execute<BookingState[]>(
    `SELECT b.id, b.customer_id AS customerId, b.service_id AS serviceId,
       b.status, b.completed_at AS completedAt,
       ca.cleaner_id AS cleanerId,
       r.id AS reviewId, r.rating, r.comment,
       r.created_at AS createdAt, r.updated_at AS updatedAt
     FROM bookings b
     LEFT JOIN cleaner_assignments ca ON ca.booking_id = b.id
     LEFT JOIN reviews r ON r.booking_id = b.id
     WHERE b.id = ? AND b.customer_id = ?
     FOR UPDATE`,
    [bookingId, customerId],
  );
  return rows[0] ?? null;
}

function withinWindow(completedAt: Date | null): boolean {
  if (!completedAt) return false;
  const deadline = new Date(completedAt).getTime() + REVIEW_WINDOW_DAYS * 86_400_000;
  return Date.now() <= deadline;
}

function guard(state: BookingState, requireExisting: boolean): ReviewFailure | 'MISSING' | null {
  if (state.status !== 'completed') return 'NOT_COMPLETED';
  if (!withinWindow(state.completedAt)) return 'WINDOW_CLOSED';
  if (requireExisting && state.reviewId === null) return 'MISSING';
  if (!requireExisting && state.reviewId !== null) return 'DUPLICATE';
  return null;
}

export async function createBookingReview(
  customerId: number,
  bookingId: number,
  input: ReviewInput,
): Promise<ReviewCreateResult> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const state = await loadBookingState(connection, customerId, bookingId);
    if (!state) {
      await connection.rollback();
      return { ok: false, reason: 'NOT_FOUND' };
    }
    const issue = guard(state, false);
    if (issue) {
      await connection.rollback();
      return { ok: false, reason: issue === 'MISSING' ? 'NOT_FOUND' : issue };
    }
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO reviews
         (booking_id, customer_id, service_id, cleaner_id, rating, comment)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        bookingId,
        customerId,
        Number(state.serviceId),
        state.cleanerId === null ? null : Number(state.cleanerId),
        input.rating,
        input.comment,
      ],
    );
    await connection.commit();
    return { ok: true, id: Number(result.insertId) };
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // rollback after an explicit rollback is a no-op
    }
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'ER_DUP_ENTRY'
    )
      return { ok: false, reason: 'DUPLICATE' };
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateBookingReview(
  customerId: number,
  bookingId: number,
  input: ReviewInput,
): Promise<ReviewUpdateResult> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const state = await loadBookingState(connection, customerId, bookingId);
    if (!state) {
      await connection.rollback();
      return { ok: false, reason: 'NOT_FOUND' };
    }
    const issue = guard(state, true);
    if (issue) {
      await connection.rollback();
      return { ok: false, reason: issue };
    }
    await connection.execute(
      'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
      [input.rating, input.comment, Number(state.reviewId)],
    );
    await connection.commit();
    return { ok: true };
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // rollback after an explicit rollback is a no-op
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function addBookingReviewPhoto(
  customerId: number,
  bookingId: number,
  photoUrl: string,
): Promise<ReviewPhotoAddResult> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const state = await loadBookingState(connection, customerId, bookingId);
    if (!state) {
      await connection.rollback();
      return { ok: false, reason: 'NOT_FOUND' };
    }
    const issue = guard(state, true);
    if (issue) {
      await connection.rollback();
      return { ok: false, reason: issue };
    }
    const reviewId = Number(state.reviewId);
    const [countRows] = await connection.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM review_photos WHERE review_id = ?',
      [reviewId],
    );
    const total = Number(countRows[0]?.total ?? 0);
    if (total >= MAX_REVIEW_PHOTOS) {
      await connection.rollback();
      return { ok: false, reason: 'LIMIT_REACHED' };
    }
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO review_photos (review_id, photo_url, sort_order)
       VALUES (?, ?, ?)`,
      [reviewId, photoUrl, total],
    );
    await connection.commit();
    return {
      ok: true,
      photo: {
        id: String(result.insertId),
        url: photoUrl,
        sortOrder: total,
      },
    };
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // rollback after an explicit rollback is a no-op
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteBookingReviewPhoto(
  customerId: number,
  bookingId: number,
  photoId: number,
): Promise<ReviewPhotoDeleteResult> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const state = await loadBookingState(connection, customerId, bookingId);
    if (!state) {
      await connection.rollback();
      return { ok: false, reason: 'NOT_FOUND' };
    }
    const issue = guard(state, true);
    if (issue) {
      await connection.rollback();
      return { ok: false, reason: issue };
    }
    const [rows] = await connection.execute<ReviewPhotoRow[]>(
      `SELECT id, photo_url AS url, sort_order AS sortOrder
       FROM review_photos
       WHERE id = ? AND review_id = ?
       LIMIT 1`,
      [photoId, Number(state.reviewId)],
    );
    const photo = rows[0];
    if (!photo) {
      await connection.rollback();
      return { ok: false, reason: 'PHOTO_MISSING' };
    }
    await connection.execute('DELETE FROM review_photos WHERE id = ?', [photoId]);
    await connection.commit();
    return { ok: true, url: photo.url };
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // rollback after an explicit rollback is a no-op
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function findBookingReview(
  customerId: number,
  bookingId: number,
): Promise<BookingReview | null> {
  const [rows] = await pool.execute<BookingState[]>(
    `SELECT b.id, b.status, b.completed_at AS completedAt,
       r.id AS reviewId, r.rating, r.comment,
       r.created_at AS createdAt, r.updated_at AS updatedAt
     FROM bookings b
     INNER JOIN reviews r ON r.booking_id = b.id
     WHERE b.id = ? AND b.customer_id = ? AND b.status = 'completed'
     LIMIT 1`,
    [bookingId, customerId],
  );
  const row = rows[0];
  if (!row || row.reviewId === null) return null;
  const reviewId = Number(row.reviewId);
  return {
    id: String(reviewId),
    rating: Number(row.rating ?? 0),
    comment: row.comment,
    createdAt: new Date(row.createdAt as Date).toISOString(),
    updatedAt: new Date(row.updatedAt as Date).toISOString(),
    editable: withinWindow(row.completedAt),
    photos: await listReviewPhotos(reviewId),
  };
}
