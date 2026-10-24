import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import {
  countFaqsUsingCategory,
  deleteCategoryById,
  deleteResourceCategoryById,
  findCategories,
  findCategoryById,
  insertCategory,
  renameFaqCategory,
  updateCategoryById,
  type CategoryInput,
} from '../model/category.model.js';
import { positiveId, requiredText } from './resource-validation.js';

type CategoryResource = 'services' | 'faqs';

function resourceFilter(value: unknown): CategoryResource {
  if (value === undefined || value === null || value === '') return 'services';
  const resource = String(value);
  if (resource !== 'services' && resource !== 'faqs')
    throw new AppError(400, 'Resource kategori tidak valid', 'VALIDATION_ERROR');
  return resource;
}

export async function getCategoriesByResource(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const resource = resourceFilter(request.query.resource);
    const rows = await findCategories(false, resource);
    response.status(200).json({
      data: rows.map((row) => ({
        id: String(row.id),
        name: row.name,
        resource,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function createCategoryByResource(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const resource = resourceFilter(request.body?.resource);
    const name = requiredText(request.body as Record<string, unknown>, 'name', 'Nama kategori', 60, false);
    const input: CategoryInput = {
      name: name!,
      description: null,
      icon: null,
      isActive: true,
    };
    const created = await insertCategory(input, resource);
    response.status(201).json({
      data: { id: String(created.id), name: created.name, resource },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCategoryByResource(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const resource = resourceFilter(request.body?.resource);
    const id = positiveId(request.params.id, 'ID kategori');
    const name = requiredText(request.body as Record<string, unknown>, 'name', 'Nama kategori', 60, false);
    const existing = await findCategoryById(id, false);
    if (!existing) throw new AppError(404, 'Kategori tidak ditemukan.');

    const updated = await updateCategoryById(id, {
      name: name!,
      description: null,
      icon: null,
      isActive: true,
    });
    if (!updated) throw new AppError(404, 'Kategori tidak ditemukan.');

    // FAQs reference the category by name, so a rename must follow through.
    // The row decides, so a client that forgets ?resource still behaves.
    if (existing.resource === 'faqs')
      await renameFaqCategory(existing.name, updated.name);
    response.status(200).json({
      data: { id: String(updated.id), name: updated.name, resource },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategoryByResource(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = positiveId(request.params.id, 'ID kategori');
    const existing = await findCategoryById(id, false);
    if (!existing) throw new AppError(404, 'Kategori tidak ditemukan.');

    if (existing.resource === 'faqs') {
      const inUse = await countFaqsUsingCategory(existing.name);
      if (inUse > 0)
        throw new AppError(
          409,
          `Kategori masih dipakai ${inUse} FAQ. Pindahkan FAQ-nya ke kategori lain terlebih dahulu.`,
          'CATEGORY_IN_USE',
        );
      // FAQ categories are referenced by name, never by foreign key, so a plain
      // delete is safe once nothing uses them.
      if (!(await deleteCategoryById(id)))
        throw new AppError(404, 'Kategori tidak ditemukan.');
      response.status(200).json({ message: 'Kategori berhasil dihapus.' });
      return;
    }

    const deleteServices = request.query.deleteServices === 'true';
    const result = await deleteResourceCategoryById(id, { deleteServices });
    if (result === 'not_found')
      throw new AppError(404, 'Kategori tidak ditemukan.');
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
    response.status(200).json({ message: 'Kategori berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
}