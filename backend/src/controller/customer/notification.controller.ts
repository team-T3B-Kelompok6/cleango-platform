import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../lib/AppError.js';
import {
  countUnreadNotifications,
  listNotifications,
  markNotificationRead,
} from '../../model/notification.model.js';

function customerId(request: Request): number {
  if (!request.user) throw new AppError(401, 'Authentication diperlukan', 'AUTH_REQUIRED');
  return request.user.id;
}

export async function getMyNotifications(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = customerId(request);
    const data = await listNotifications(userId);
    response.status(200).json({
      data,
      meta: { unread: await countUnreadNotifications(userId) },
    });
  } catch (error) {
    next(error);
  }
}

export async function readMyNotification(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id <= 0)
      throw new AppError(400, 'ID notifikasi tidak valid', 'VALIDATION_ERROR');
    if (!(await markNotificationRead(customerId(request), id)))
      throw new AppError(404, 'Notifikasi tidak ditemukan.');
    response.status(200).json({ message: 'Notifikasi ditandai sudah dibaca.' });
  } catch (error) {
    next(error);
  }
}
