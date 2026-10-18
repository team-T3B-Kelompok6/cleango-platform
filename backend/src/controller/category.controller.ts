import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import { findCategories } from '../model/category.model.js';

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