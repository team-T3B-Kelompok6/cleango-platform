import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import {
  deleteCategoryById,
  findCategories,
  insertCategory,
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
    const rows = await findCategories(false);
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
    const created = await insertCategory(input);
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
    const updated = await updateCategoryById(id, {
      name: name!,
      description: null,
      icon: null,
      isActive: true,
    });
    if (!updated) throw new AppError(404, 'Kategori tidak ditemukan.');
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
    if (!(await deleteCategoryById(positiveId(request.params.id, 'ID kategori'))))
      throw new AppError(404, 'Kategori tidak ditemukan.');
    response.status(200).json({ message: 'Kategori berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
}