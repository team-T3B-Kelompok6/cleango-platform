import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../lib/AppError.js';
import { findServiceById, findServiceInclusions, findServices } from '../../model/service.model.js';

function numericId(value: unknown, field: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, `${field} tidak valid`);
  return id;
}

export async function getServices(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const search = typeof request.query.search === 'string' && request.query.search.trim()
      ? request.query.search.trim()
      : null;
    if (search && search.length > 100) throw new AppError(400, 'Pencarian maksimal 100 karakter');
    const categoryId = request.query.category === undefined
      ? null
      : numericId(String(request.query.category), 'Kategori');
    const services = await findServices({ search, categoryId, activeOnly: true });
    response.status(200).json({ data: services });
  } catch (error) {
    next(error);
  }
}

export async function getServiceDetail(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const service = await findServiceById(numericId(request.params.id, 'ID layanan'), true);
    if (!service) throw new AppError(404, 'Layanan tidak ditemukan');
    const inclusions = await findServiceInclusions(service.id);
    response.status(200).json({ data: { ...service, inclusions } });
  } catch (error) {
    next(error);
  }
}
