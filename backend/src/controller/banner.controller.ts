import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import {
  deleteBannerById,
  findBanner,
  insertBanner,
  listBanners,
  updateBannerById,
} from '../model/banner.model.js';
import { positiveId, validationError } from './resource-validation.js';

export const UPLOAD_DIR = process.env.CLEANGO_UPLOAD_DIR || 'uploads';
const MAX_BYTES = 2 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

function imageUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim())
    validationError({ imageUrl: 'Alamat gambar wajib diisi.' });
  const url = value.trim();
  const local = /^\/(?!\/)[^\s\\]*$/.test(url);
  const remote = /^https?:\/\/\S+$/.test(url);
  if (!local && !remote)
    validationError({
      imageUrl: 'Alamat gambar harus berupa tautan http/https atau path yang diawali /.',
    });
  if (url.length > 255) validationError({ imageUrl: 'Alamat gambar terlalu panjang.' });
  return url;
}

export async function getBanners(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.status(200).json({ data: await listBanners() });
  } catch (error) {
    next(error);
  }
}

export async function getBanner(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await findBanner(positiveId(request.params.id, 'ID banner'));
    if (!data) throw new AppError(404, 'Banner tidak ditemukan.');
    response.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function createBanner(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await insertBanner(imageUrl(request.body?.imageUrl));
    response.status(201).json({ message: 'Banner berhasil ditambahkan.', data });
  } catch (error) {
    next(error);
  }
}

export async function updateBanner(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await updateBannerById(
      positiveId(request.params.id, 'ID banner'),
      imageUrl(request.body?.imageUrl),
    );
    if (!data) throw new AppError(404, 'Banner tidak ditemukan.');
    response.status(200).json({ message: 'Banner berhasil diperbarui.', data });
  } catch (error) {
    next(error);
  }
}

export async function deleteBanner(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!(await deleteBannerById(positiveId(request.params.id, 'ID banner'))))
      throw new AppError(404, 'Banner tidak ditemukan.');
    response.status(200).json({ message: 'Banner berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
}

export async function uploadImage(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const bytes = request.body;
    if (!Buffer.isBuffer(bytes) || bytes.length === 0)
      throw new AppError(400, 'Pilih gambar yang akan diunggah.', 'VALIDATION_ERROR');
    if (bytes.length > MAX_BYTES)
      throw new AppError(400, 'Ukuran gambar maksimal 2 MB.', 'VALIDATION_ERROR');
    const contentType = request.header('content-type') ?? '';
    const extension = EXTENSIONS[contentType];
    if (!extension)
      throw new AppError(
        400,
        'Format gambar harus PNG, JPEG, atau WebP.',
        'VALIDATION_ERROR',
      );

    await mkdir(UPLOAD_DIR, { recursive: true });
    const name = `${randomUUID()}${extension}`;
    await writeFile(path.join(UPLOAD_DIR, name), bytes);
    response.status(201).json({ data: { url: `/${UPLOAD_DIR}/${name}` } });
  } catch (error) {
    next(error);
  }
}