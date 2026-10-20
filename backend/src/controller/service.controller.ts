import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import {
  deletePlatformService,
  findPlatformService,
  insertPlatformService,
  listPlatformServices,
  SERVICE_SORTS,
  type ServiceSort,
  SERVICE_CATEGORY_DATABASE_NAMES,
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
    if (
      typeof body.category !== 'string' ||
      !(body.category in SERVICE_CATEGORY_DATABASE_NAMES)
    ) {
      validationError({ category: 'Kategori layanan tidak valid.' });
    }
    category = body.category as ServiceCategory;
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
  if (partial) requireChanges(input);
  return input;
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
      if (
        typeof request.query.category !== 'string' ||
        !(request.query.category in SERVICE_CATEGORY_DATABASE_NAMES)
      )
        validationError({ category: 'Kategori layanan tidak valid.' });
      category = request.query.category as ServiceCategory;
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
    next(error);
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
    next(error);
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
