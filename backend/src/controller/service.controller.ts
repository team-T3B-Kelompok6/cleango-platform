import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import {
  deletePlatformService,
  findPlatformService,
  insertPlatformService,
  listPlatformServices,
  SERVICE_SORTS,
  type ServiceSort,
  updatePlatformService,
  type PlatformServiceInput,
  type ServiceCategory,
} from '../model/platform-service.model.js';
import {
  booleanValue,
  positiveId,
  requiredText,
  requireChanges,
  validationError,
} from './resource-validation.js';

function durationMinutes(duration: string): number {
  const numbers =
    duration
      .match(/\d+(?:[.,]\d+)?/g)
      ?.map((value) => Number(value.replace(',', '.'))) ?? [];
  if (!numbers.length)
    validationError({
      duration: 'Durasi harus memuat angka, misalnya 2–3 jam.',
    });
  const average =
    numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  const minutes = /jam/i.test(duration)
    ? Math.round(average * 60)
    : Math.round(average);
  if (minutes <= 0 || minutes > 1440)
    validationError({ duration: 'Durasi harus antara 1 menit dan 24 jam.' });
  return minutes;
}


// Local upload paths (from POST /uploads) or absolute http(s) URLs only.
function imageUrlValue(body: Record<string, unknown>): string | null {
  const raw = body.imageUrl;
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') {
    validationError({ imageUrl: 'Alamat foto tidak valid.' });
  }
  const value = (raw as string).trim();
  if (!value) return null;
  const local = /^\/(?!\/)[^\s\\]*$/.test(value);
  const remote = /^https?:\/\/\S+$/.test(value);
  if (!local && !remote)
    validationError({
      imageUrl: 'Alamat foto harus berupa tautan http/https atau path yang diawali /.',
    });
  if (value.length > 500) validationError({ imageUrl: 'Alamat foto terlalu panjang.' });
  return value;
}

function inputFrom(
  body: Record<string, unknown>,
  partial: boolean,
): Partial<PlatformServiceInput> {
  const name = requiredText(body, 'name', 'Nama layanan', 150, partial);
  const duration = requiredText(body, 'duration', 'Durasi', 80, partial);
  const description = requiredText(
    body,
    'description',
    'Deskripsi',
    3000,
    partial,
  );
  let category: ServiceCategory | undefined;
  if (!partial || body.category !== undefined) {
    if (typeof body.category !== 'string' || !body.category.trim()) {
      validationError({ category: 'Kategori layanan wajib diisi.' });
    }
    const value = (body.category as string).trim();
    if (value.length > 100)
      validationError({ category: 'Kategori maksimal 100 karakter.' });
    category = value;
  }
  let price: number | undefined;
  if (!partial || body.price !== undefined) {
    price = Number(body.price);
    if (!Number.isFinite(price) || price < 0)
      validationError({ price: 'Harga harus berupa angka nol atau lebih.' });
  }
  let features: string[] | undefined;
  if (!partial || body.features !== undefined) {
    if (
      !Array.isArray(body.features) ||
      body.features.some((item) => typeof item !== 'string')
    ) {
      validationError({ features: 'Fasilitas harus berupa daftar teks.' });
    }
    features = [
      ...new Set(
        (body.features as string[]).map((item) => item.trim()).filter(Boolean),
      ),
    ];
    if (features.some((item) => item.length > 255))
      validationError({ features: 'Setiap fasilitas maksimal 255 karakter.' });
  }
  const active = booleanValue(body, 'active', 'Status publikasi', partial);
  let imageUrl: string | null | undefined;
  if (!partial || body.imageUrl !== undefined) imageUrl = imageUrlValue(body);
  const input: Partial<PlatformServiceInput> = {};
  if (name !== undefined) input.name = name;
  if (category !== undefined) input.category = category;
  if (duration !== undefined) {
    input.duration = duration;
    input.durationMinutes = durationMinutes(duration);
  }
  if (price !== undefined) input.price = price;
  if (description !== undefined) input.description = description;
  if (active !== undefined) input.active = active;
  if (features !== undefined) input.features = features;
  if (imageUrl !== undefined) input.imageUrl = imageUrl;
  if (partial) requireChanges(input);
  return input;
}


// A category that is not registered (or is inactive) is a client mistake, not a
// server fault.
function categoryError(error: unknown): unknown {
  if (error instanceof Error && error.message === 'CATEGORY_NOT_FOUND') {
    return new AppError(400, 'Periksa kembali data yang dikirim.', 'VALIDATION_ERROR', {
      category: 'Kategori layanan tidak ditemukan.',
    });
  }
  return error;
}

export async function getServices(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const search =
      typeof request.query.search === 'string' && request.query.search.trim()
        ? request.query.search.trim()
        : null;
    if (search && search.length > 100)
      validationError({ search: 'Pencarian maksimal 100 karakter.' });

    let category: ServiceCategory | null = null;
    if (request.query.category !== undefined && request.query.category !== '') {
      if (typeof request.query.category !== 'string')
        validationError({ category: 'Kategori layanan tidak valid.' });
      const value = (request.query.category as string).trim();
      if (!value || value.length > 100)
        validationError({ category: 'Kategori layanan tidak valid.' });
      category = value;
    }

    let sort: ServiceSort = 'name';
    if (request.query.sort !== undefined && request.query.sort !== '') {
      if (
        typeof request.query.sort !== 'string' ||
        !SERVICE_SORTS.includes(request.query.sort as ServiceSort)
      )
        validationError({ sort: 'Pengurutan tidak valid.' });
      sort = request.query.sort as ServiceSort;
    }

    const activeOnly = request.query.active === 'true';
    response.status(200).json({
      data: await listPlatformServices({ search, category, activeOnly, sort }),
    });
  } catch (error) {
    next(error);
  }
}
export async function getService(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const service = await findPlatformService(
      positiveId(request.params.id, 'ID layanan'),
    );
    if (!service) throw new AppError(404, 'Layanan tidak ditemukan.');
    response.status(200).json({ data: service });
  } catch (error) {
    next(error);
  }
}
export async function createService(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await insertPlatformService(
      inputFrom(
        request.body as Record<string, unknown>,
        false,
      ) as PlatformServiceInput,
    );
    response.status(201).json({ message: 'Layanan berhasil dibuat.', data });
  } catch (error) {
    next(categoryError(error));
  }
}
export async function updateService(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await updatePlatformService(
      positiveId(request.params.id, 'ID layanan'),
      inputFrom(request.body as Record<string, unknown>, true),
    );
    if (!data) throw new AppError(404, 'Layanan tidak ditemukan.');
    response
      .status(200)
      .json({ message: 'Layanan berhasil diperbarui.', data });
  } catch (error) {
    next(categoryError(error));
  }
}
export async function deleteService(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (
      !(await deletePlatformService(
        positiveId(request.params.id, 'ID layanan'),
      ))
    )
      throw new AppError(404, 'Layanan tidak ditemukan.');
    response.status(200).json({ message: 'Layanan berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
}
