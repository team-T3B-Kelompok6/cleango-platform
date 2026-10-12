import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../lib/AppError.js';
import { findCategoryById } from '../../model/category.model.js';
import {
  deleteServiceById,
  findServiceById,
  findServiceInclusions,
  findServices,
  insertService,
  updateServiceById,
  type ServiceInput,
} from '../../model/service.model.js';

function positiveId(value: unknown, field: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, `${field} tidak valid`);
  return id;
}

function optionalText(value: unknown, field: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new AppError(400, `${field} harus berupa teks`);
  return value.trim();
}

function serviceInput(body: Record<string, unknown>, partial: boolean): Partial<ServiceInput> {
  const input: Partial<ServiceInput> = {};
  if (!partial || body.categoryId !== undefined) input.categoryId = positiveId(body.categoryId, 'categoryId');
  if (!partial || body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) throw new AppError(400, 'Nama layanan wajib diisi');
    if (body.name.trim().length > 150) throw new AppError(400, 'Nama layanan maksimal 150 karakter');
    input.name = body.name.trim();
  }
  if (!partial || body.description !== undefined) input.description = optionalText(body.description, 'Deskripsi');
  if (!partial || body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) throw new AppError(400, 'Harga harus berupa angka minimal 0');
    input.price = price;
  }
  if (!partial || body.durationMinutes !== undefined) {
    const duration = Number(body.durationMinutes);
    if (!Number.isInteger(duration) || duration <= 0) throw new AppError(400, 'Durasi harus berupa bilangan bulat lebih dari 0');
    input.durationMinutes = duration;
  }
  if (!partial || body.imageUrl !== undefined) input.imageUrl = optionalText(body.imageUrl, 'URL gambar');
  if (!partial || body.isActive !== undefined) {
    if (body.isActive !== undefined && typeof body.isActive !== 'boolean') throw new AppError(400, 'isActive harus boolean');
    input.isActive = body.isActive === undefined ? true : body.isActive;
  }
  if (partial && Object.keys(input).length === 0) throw new AppError(400, 'Tidak ada data yang diperbarui');
  return input;
}

async function ensureCategory(categoryId: number | undefined): Promise<void> {
  if (categoryId !== undefined && !await findCategoryById(categoryId, false)) {
    throw new AppError(400, 'Kategori tidak ditemukan');
  }
}

export async function getServices(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const search = typeof request.query.search === 'string' && request.query.search.trim()
      ? request.query.search.trim() : null;
    const categoryId = request.query.category === undefined
      ? null : positiveId(request.query.category, 'Kategori');
    response.status(200).json({ data: await findServices({ search, categoryId, activeOnly: false }) });
  } catch (error) { next(error); }
}

export async function getServiceDetail(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const service = await findServiceById(positiveId(request.params.id, 'ID layanan'), false);
    if (!service) throw new AppError(404, 'Layanan tidak ditemukan');
    const inclusions = await findServiceInclusions(service.id);
    response.status(200).json({ data: { ...service, inclusions } });
  } catch (error) { next(error); }
}

export async function createService(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const input = serviceInput(request.body as Record<string, unknown>, false) as ServiceInput;
    await ensureCategory(input.categoryId);
    response.status(201).json({ message: 'Layanan berhasil dibuat', data: await insertService(input) });
  } catch (error) { next(error); }
}

export async function updateService(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const input = serviceInput(request.body as Record<string, unknown>, true);
    await ensureCategory(input.categoryId);
    const service = await updateServiceById(positiveId(request.params.id, 'ID layanan'), input);
    if (!service) throw new AppError(404, 'Layanan tidak ditemukan');
    response.status(200).json({ message: 'Layanan berhasil diperbarui', data: service });
  } catch (error) { next(error); }
}

export async function deleteService(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!await deleteServiceById(positiveId(request.params.id, 'ID layanan'))) {
      throw new AppError(404, 'Layanan tidak ditemukan');
    }
    response.status(200).json({ message: 'Layanan berhasil dihapus' });
  } catch (error) { next(error); }
}
