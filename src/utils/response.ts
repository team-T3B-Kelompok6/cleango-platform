import type { Response } from 'express';

export function sendSuccess<T>(
  response: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
): Response {
  return response.status(statusCode).json({ success: true, message, data });
}

export function sendList<T>(
  response: Response,
  items: T[],
  meta: { page: number; limit: number; total: number; totalPages: number },
): Response {
  return response.status(200).json({ success: true, message: 'Success', data: items, meta });
}
