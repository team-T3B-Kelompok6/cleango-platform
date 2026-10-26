import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { isTokenRevoked } from '../model/user.model.js';

export async function authenticate(
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authorization = request.header('authorization');
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    if (!match?.[1]) throw new AppError(401, 'Authentication diperlukan', 'AUTH_REQUIRED');
    const payload = verifyAccessToken(match[1]);

    // Changing the password revokes every token issued before that moment, so
    // an old (possibly leaked) session cannot keep working.
    if (payload.issuedAt !== undefined) {
      try {
        if (await isTokenRevoked(payload.id, payload.issuedAt)) {
          throw new AppError(
            401,
            'Sesi berakhir karena kata sandi diubah. Silakan masuk kembali.',
            'SESSION_REVOKED',
          );
        }
      } catch (error) {
        if (error instanceof AppError) throw error;
        // A valid signature cannot prove that this session has not been revoked.
        throw new AppError(
          503,
          'Sesi belum dapat diperiksa. Silakan coba kembali sebentar lagi.',
          'AUTH_UNAVAILABLE',
        );
      }
    }

    request.user = payload;
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, 'Token tidak valid atau kedaluwarsa', 'INVALID_TOKEN'));
  }
}

export function requireCustomer(request: Request, _response: Response, next: NextFunction): void {
  if (!request.user) {
    next(new AppError(401, 'Authentication diperlukan', 'AUTH_REQUIRED'));
    return;
  }
  if (request.user.role !== 'customer') {
    next(new AppError(403, 'Akses customer diperlukan', 'FORBIDDEN'));
    return;
  }
  next();
}
