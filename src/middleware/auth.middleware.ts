import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import { verifyAccessToken } from '../lib/jwt.js';

export function authenticate(request: Request, _response: Response, next: NextFunction): void {
  try {
    const authorization = request.header('authorization');
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    if (!match?.[1]) throw new AppError(401, 'Authentication diperlukan', 'AUTH_REQUIRED');
    request.user = verifyAccessToken(match[1]);
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, 'Token tidak valid atau kedaluwarsa', 'INVALID_TOKEN'));
  }
}
