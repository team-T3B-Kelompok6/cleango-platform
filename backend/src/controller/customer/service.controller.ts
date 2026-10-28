import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../lib/AppError.js';
import {
  findServiceById,
  findServiceInclusions,
  findServiceReviewStats,
  findServices,
  listServiceReviews,
} from '../../model/service.model.js';
import { resolveBookableServiceId } from '../../model/booking.model.js';

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
    const serviceId = await resolveBookableServiceId(String(request.params.id));
    const service = serviceId ? await findServiceById(serviceId, true) : null;
    if (!service) throw new AppError(404, 'Layanan tidak ditemukan');
    const [inclusions, stats] = await Promise.all([
      findServiceInclusions(service.id),
      findServiceReviewStats(service.id),
    ]);
    response.status(200).json({
      data: { ...service, inclusions, ...stats },
    });
  } catch (error) {
    next(error);
  }
}

function pageValue(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export async function getServiceReviews(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const serviceId = await resolveBookableServiceId(String(request.params.id));
    const service = serviceId ? await findServiceById(serviceId, true) : null;
    if (!service) throw new AppError(404, 'Layanan tidak ditemukan');
    const page = pageValue(request.query.page, 1, 100_000);
    const limit = pageValue(request.query.limit, 10, 20);
    const [stats, reviews] = await Promise.all([
      findServiceReviewStats(service.id),
      listServiceReviews(service.id, page, limit),
    ]);
    response.status(200).json({
      data: {
        ...stats,
        reviews,
        page,
        limit,
        hasMore: page * limit < stats.reviewCount,
      },
    });
  } catch (error) {
    next(error);
  }
}
