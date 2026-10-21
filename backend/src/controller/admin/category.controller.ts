import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../lib/AppError.js';
import {
  deleteResourceCategoryById,
  findCategories,
  findCategoryById,
  insertCategory,
  updateCategoryById,
  type CategoryInput,
} from '../../model/category.model.js';

function numericId(value: unknown): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID kategori tidak valid');
  return id;
}

function optionalText(value: unknown, field: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new AppError(400, `${field} harus berupa teks`);
  return value.trim();
}

function categoryInput(body: Record<string, unknown>, partial: boolean): Partial<CategoryInput> {
  const input: Partial<CategoryInput> = {};
  if (!partial || body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) throw new AppError(400, 'Nama kategori wajib diisi');
    if (body.name.trim().length > 100) throw new AppError(400, 'Nama kategori maksimal 100 karakter');
    input.name = body.name.trim();
  }
  if (!partial || body.description !== undefined) input.description = optionalText(body.description, 'Deskripsi');
  if (!partial || body.icon !== undefined) input.icon = optionalText(body.icon, 'Icon');
  if (!partial || body.isActive !== undefined) {
    if (body.isActive !== undefined && typeof body.isActive !== 'boolean') throw new AppError(400, 'isActive harus boolean');
    input.isActive = body.isActive === undefined ? true : body.isActive;
  }
  if (partial && Object.keys(input).length === 0) throw new AppError(400, 'Tidak ada data yang diperbarui');
  return input;
}

export async function getCategories(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    response.status(200).json({ data: await findCategories(false, 'services') });
  } catch (error) { next(error); }
}

export async function getCategoryDetail(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const category = await findCategoryById(numericId(request.params.id), false);
    if (!category || category.resource !== 'services')
      throw new AppError(404, 'Kategori tidak ditemukan');
    response.status(200).json({ data: category });
  } catch (error) { next(error); }
}

export async function createCategory(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const input = categoryInput(request.body as Record<string, unknown>, false) as CategoryInput;
    response.status(201).json({ message: 'Kategori berhasil dibuat', data: await insertCategory(input, 'services') });
  } catch (error) { next(error); }
}

export async function updateCategory(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await findCategoryById(numericId(request.params.id), false);
    if (!existing || existing.resource !== 'services')
      throw new AppError(404, 'Kategori tidak ditemukan');
    const category = await updateCategoryById(
      numericId(request.params.id),
      categoryInput(request.body as Record<string, unknown>, true),
    );
    if (!category) throw new AppError(404, 'Kategori tidak ditemukan');
    response.status(200).json({ message: 'Kategori berhasil diperbarui', data: category });
  } catch (error) { next(error); }
}

export async function deleteCategory(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const deleteServices = request.query.deleteServices === 'true';
    const result = await deleteResourceCategoryById(
      numericId(request.params.id),
      { deleteServices },
    );
    if (result === 'not_found') throw new AppError(404, 'Kategori tidak ditemukan');
    if (result === 'in_use_by_services')
      throw new AppError(
        409,
        'Kategori masih digunakan oleh layanan. Centang hapus semua layanan atau pindahkan layanannya terlebih dahulu.',
        'CATEGORY_IN_USE',
      );
    if (result === 'in_use_by_orders')
      throw new AppError(
        409,
        'Kategori tidak dapat dihapus karena layanannya sudah dipakai pada pesanan. Pindahkan layanan ke kategori lain.',
        'CATEGORY_IN_USE',
      );
    response.status(200).json({ message: 'Kategori berhasil dihapus' });
  } catch (error) { next(error); }
}
