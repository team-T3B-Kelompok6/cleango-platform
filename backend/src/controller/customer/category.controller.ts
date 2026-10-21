import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../lib/AppError.js';
import {
  findCategories,
  findCategoryById,
  listPopularServiceCategories,
} from '../../model/category.model.js';

function numericId(value: unknown): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID kategori tidak valid');
  return id;
}

export async function getCategories(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    response.status(200).json({ data: await findCategories(true) });
  } catch (error) {
    next(error);
  }
}

export async function getCategoryDetail(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const category = await findCategoryById(numericId(request.params.id), true);
    if (!category) throw new AppError(404, 'Kategori tidak ditemukan');
    response.status(200).json({ data: category });
  } catch (error) {
    next(error);
  }
}

/** Categories ranked by bookings; the home screen shows at most 8. */
export async function getPopularCategories(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const raw = Number(request.query.limit ?? 8);
    const limit = Number.isFinite(raw) ? Math.trunc(raw) : 8;
    response.status(200).json({ data: await listPopularServiceCategories(limit) });
  } catch (error) {
    next(error);
  }
}
