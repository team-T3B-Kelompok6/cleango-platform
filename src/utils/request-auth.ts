import type { Request } from 'express';
import type { AuthContext } from '../types/domain.js';
import { AppError } from './app-error.js';

export function requestAuth(request: Request): AuthContext {
  if (!request.authUser || !request.accessToken) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required');
  }
  return { userId: request.authUser.id, accessToken: request.accessToken };
}
