import type { NextFunction, Request, Response } from 'express';
import { createUserClient } from '../config/supabase.js';
import { AppError } from '../utils/app-error.js';

export async function requireAdmin(
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  if (!request.authUser || !request.accessToken) {
    next(new AppError(401, 'AUTH_REQUIRED', 'Authentication is required'));
    return;
  }

  const { data, error } = await createUserClient(request.accessToken)
    .from('profiles')
    .select('role')
    .eq('id', request.authUser.id)
    .single();

  if (error || !data) {
    next(new AppError(404, 'PROFILE_NOT_FOUND', 'Profile not found'));
    return;
  }
  if (data.role !== 'admin') {
    next(new AppError(403, 'FORBIDDEN', 'Admin access is required'));
    return;
  }
  next();
}
