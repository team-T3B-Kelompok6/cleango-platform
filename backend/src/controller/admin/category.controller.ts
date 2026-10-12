import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../lib/AppError.js';
import {
  deleteCategoryById,
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
    response.status(200).json({ data: await findCategories(false) });
  } catch (error) { next(error); }
}

export async function getCategoryDetail(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const category = await findCategoryById(numericId(request.params.id), false);
    if (!category) throw new AppError(404, 'Kategori tidak ditemukan');
    response.status(200).json({ data: category });
  } catch (error) { next(error); }
}

export async function createCategory(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const input = categoryInput(request.body as Record<string, unknown>, false) as CategoryInput;
    response.status(201).json({ message: 'Kategori berhasil dibuat', data: await insertCategory(input) });
  } catch (error) { next(error); }
}

export async function updateCategory(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
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
    if (!await deleteCategoryById(numericId(request.params.id))) throw new AppError(404, 'Kategori tidak ditemukan');
    response.status(200).json({ message: 'Kategori berhasil dihapus' });
  } catch (error) { next(error); }
}
