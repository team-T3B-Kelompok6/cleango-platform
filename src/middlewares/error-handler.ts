import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/app-error.js';

const knownDatabaseCodes = new Set([
  'AUTH_REQUIRED', 'FORBIDDEN', 'PROFILE_NOT_FOUND', 'SERVICE_NOT_FOUND',
  'SERVICE_INACTIVE', 'ADDRESS_NOT_FOUND', 'ADDRESS_NOT_OWNED',
  'BOOKING_NOT_FOUND', 'INVALID_BOOKING_STATUS', 'INVALID_STATUS_TRANSITION',
  'CLEANER_NOT_FOUND', 'CLEANER_NOT_ACTIVE', 'CLEANER_SCHEDULE_CONFLICT',
  'PROMO_NOT_FOUND', 'PROMO_EXPIRED', 'PROMO_INVALID', 'PROMO_ALREADY_USED',
  'PROMO_USAGE_LIMIT_REACHED', 'INVALID_BOOKING_SCHEDULE',
]);

function databaseError(error: unknown): AppError | undefined {
  if (!error || typeof error !== 'object' || !('message' in error)) return undefined;
  const message = String(error.message);
  const code = [...knownDatabaseCodes].find((candidate) => message.includes(candidate));
  if (!code) return undefined;
  const statusCode = code === 'AUTH_REQUIRED' ? 401 : code === 'FORBIDDEN' ? 403 : 400;
  return new AppError(statusCode, code, code.replaceAll('_', ' ').toLowerCase());
}

export const globalErrorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const normalized = error instanceof AppError
    ? error
    : error instanceof ZodError
      ? new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', error.flatten())
      : databaseError(error) ?? new AppError(500, 'INTERNAL_SERVER_ERROR', 'Internal server error');

  if (normalized.statusCode >= 500) console.error(error);
  response.status(normalized.statusCode).json({
    success: false,
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details === undefined ? {} : { details: normalized.details }),
    },
  });
};
