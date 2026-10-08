import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';

export function requireAdmin(request: Request, _response: Response, next: NextFunction): void {
  if (!request.user) {
    next(new AppError(401, 'Authentication diperlukan', 'AUTH_REQUIRED'));
    return;
  }
  if (request.user.role !== 'admin') {
    next(new AppError(403, 'Akses admin diperlukan', 'FORBIDDEN'));
    return;
  }
  next();
}
