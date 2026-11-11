import { Router } from 'express';
import { AppError } from '../../lib/AppError.js';
import {
  markAdminNotificationsRead,
  listAdminReadReceipts,
} from '../../model/admin-notification.model.js';

export const adminNotificationRouter = Router();

adminNotificationRouter.get('/read', async (request, response, next) => {
  const adminId = request.user?.id;
  if (typeof adminId !== 'number') {
    next(new AppError(401, 'Authentication diperlukan', 'AUTH_REQUIRED'));
    return;
  }
  const bookingIds = await listAdminReadReceipts(adminId);
  response.json({ success: true, bookingIds });
});

adminNotificationRouter.post('/read', async (request, response, next) => {
  const adminId = request.user?.id;
  if (typeof adminId !== 'number') {
    next(new AppError(401, 'Authentication diperlukan', 'AUTH_REQUIRED'));
    return;
  }
  const body = request.body;
  if (body === null || body === undefined || typeof body !== 'object' || Array.isArray(body)) {
    next(new AppError(400, 'ID booking tidak valid', 'INVALID_BOOKING_IDS'));
    return;
  }
  const { bookingIds } = body as { bookingIds?: unknown };
  if (!Array.isArray(bookingIds) || bookingIds.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    next(new AppError(400, 'ID booking tidak valid', 'INVALID_BOOKING_IDS'));
    return;
  }
  const count = await markAdminNotificationsRead(adminId, bookingIds);
  response.json({ success: true, marked: count });
});