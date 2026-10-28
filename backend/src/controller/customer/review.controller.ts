import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../lib/AppError.js';
import {
  removeStoredFile,
  saveImage,
  storedPathFromUrl,
} from '../../lib/image-storage.js';
import {
  addBookingReviewPhoto,
  createBookingReview,
  deleteBookingReviewPhoto,
  findBookingReview,
  updateBookingReview,
} from '../../model/review.model.js';

function customerId(request: Request): number {
  if (!request.user)
    throw new AppError(401, 'Authentication diperlukan', 'AUTH_REQUIRED');
  return request.user.id;
}

function numericId(value: unknown, label: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0)
    throw new AppError(400, 'Periksa kembali data yang dikirim.', 'VALIDATION_ERROR', {
      id: `${label} tidak valid.`,
    });
  return id;
}

function reviewInput(body: Record<string, unknown>): { rating: number; comment: string | null } {
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    throw new AppError(400, 'Periksa kembali data yang dikirim.', 'VALIDATION_ERROR', {
      rating: 'Pilih rating 1 sampai 5.',
    });
  const rawComment = typeof body.comment === 'string' ? body.comment.trim() : '';
  if (rawComment.length > 1000)
    throw new AppError(400, 'Periksa kembali data yang dikirim.', 'VALIDATION_ERROR', {
      comment: 'Maksimal 1000 karakter.',
    });
  return { rating, comment: rawComment || null };
}

export async function getBookingReview(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const bookingId = numericId(request.params.id, 'ID pesanan');
    const review = await findBookingReview(customerId(request), bookingId);
    response.status(200).json({ data: review });
  } catch (error) {
    next(error);
  }
}

export async function putBookingReview(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const bookingId = numericId(request.params.id, 'ID pesanan');
    const input = reviewInput((request.body ?? {}) as Record<string, unknown>);
    const result = await updateBookingReview(customerId(request), bookingId, input);
    if (!result.ok) {
      if (result.reason === 'NOT_FOUND' || result.reason === 'MISSING')
        throw new AppError(404, 'Ulasan tidak ditemukan.');
      if (result.reason === 'NOT_COMPLETED')
        throw new AppError(409, 'Pesanan belum selesai.', 'REVIEW_NOT_READY');
      throw new AppError(
        409,
        'Batas waktu mengubah ulasan sudah lewat.',
        'REVIEW_WINDOW_CLOSED',
      );
    }
    response.status(200).json({ message: 'Ulasan diperbarui.', data: input });
  } catch (error) {
    next(error);
  }
}

function photoFailure(reason: string): AppError {
  if (reason === 'NOT_FOUND')
    return new AppError(404, 'Pesanan tidak ditemukan.');
  if (reason === 'MISSING')
    return new AppError(404, 'Ulasan tidak ditemukan.');
  if (reason === 'NOT_COMPLETED')
    return new AppError(409, 'Pesanan belum selesai.', 'REVIEW_NOT_READY');
  if (reason === 'WINDOW_CLOSED')
    return new AppError(
      409,
      'Batas waktu mengubah ulasan sudah lewat.',
      'REVIEW_WINDOW_CLOSED',
    );
  if (reason === 'LIMIT_REACHED')
    return new AppError(
      409,
      'Maksimal 3 foto untuk satu ulasan.',
      'REVIEW_PHOTO_LIMIT',
    );
  return new AppError(404, 'Foto ulasan tidak ditemukan.', 'PHOTO_NOT_FOUND');
}

export async function postBookingReviewPhoto(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  let saved: Awaited<ReturnType<typeof saveImage>> | null = null;
  try {
    const bookingId = numericId(request.params.id, 'ID pesanan');
    saved = await saveImage(
      request.body,
      request.header('content-type') ?? '',
      'review-photos',
    );
    const result = await addBookingReviewPhoto(
      customerId(request),
      bookingId,
      saved.url,
    );
    if (!result.ok) throw photoFailure(result.reason);
    response.status(201).json({
      message: 'Foto ulasan berhasil ditambahkan.',
      data: result.photo,
    });
  } catch (error) {
    if (saved) await removeStoredFile(saved.storagePath);
    next(error);
  }
}

export async function deleteBookingReviewPhotoHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const bookingId = numericId(request.params.id, 'ID pesanan');
    const photoId = numericId(request.params.photoId, 'ID foto');
    const result = await deleteBookingReviewPhoto(
      customerId(request),
      bookingId,
      photoId,
    );
    if (!result.ok) throw photoFailure(result.reason);
    const storagePath = storedPathFromUrl(result.url);
    if (storagePath) await removeStoredFile(storagePath);
    response.status(200).json({ message: 'Foto ulasan berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
}

export async function postBookingReview(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const bookingId = numericId(request.params.id, 'ID pesanan');
    const body = (request.body ?? {}) as Record<string, unknown>;

    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      throw new AppError(400, 'Periksa kembali data yang dikirim.', 'VALIDATION_ERROR', {
        rating: 'Pilih rating 1 sampai 5.',
      });

    const rawComment = typeof body.comment === 'string' ? body.comment.trim() : '';
    if (rawComment.length > 1000)
      throw new AppError(400, 'Periksa kembali data yang dikirim.', 'VALIDATION_ERROR', {
        comment: 'Maksimal 1000 karakter.',
      });

    const result = await createBookingReview(customerId(request), bookingId, {
      rating,
      comment: rawComment || null,
    });
    if (!result.ok) {
      if (result.reason === 'NOT_FOUND')
        throw new AppError(404, 'Pesanan tidak ditemukan.');
      if (result.reason === 'NOT_COMPLETED')
        throw new AppError(
          409,
          'Ulasan hanya tersedia setelah pesanan selesai.',
          'REVIEW_NOT_READY',
        );
      if (result.reason === 'WINDOW_CLOSED')
        throw new AppError(
          409,
          'Batas waktu mengulas sudah lewat (7 hari setelah selesai).',
          'REVIEW_WINDOW_CLOSED',
        );
      throw new AppError(
        409,
        'Pesanan ini sudah diulas.',
        'REVIEW_EXISTS',
      );
    }
    response.status(201).json({
      message: 'Ulasan berhasil dikirim.',
      data: { id: String(result.id), rating, comment: rawComment || null },
    });
  } catch (error) {
    next(error);
  }
}
