import type { NextFunction, Request, Response } from 'express';
import { createPublicClient } from '../config/supabase.js';
import { AppError } from '../utils/app-error.js';

export async function authenticate(
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = request.header('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) {
    next(new AppError(401, 'AUTH_REQUIRED', 'Authentication is required'));
    return;
  }

  const token = match[1];
  const { data, error } = await createPublicClient().auth.getUser(token);
  if (error || !data.user) {
    next(new AppError(401, 'INVALID_TOKEN', 'Access token is invalid or expired'));
    return;
  }

  request.authUser = data.user;
  request.accessToken = token;
  next();
}
