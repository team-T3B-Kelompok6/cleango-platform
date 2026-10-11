import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import { findOrder, listOrders } from '../model/order.model.js';
import { positiveId } from './resource-validation.js';

export async function getOrders(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.status(200).json({ data: await listOrders() });
  } catch (error) {
    next(error);
  }
}

export async function getOrder(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await findOrder(positiveId(request.params.id, 'ID pesanan'));
    if (!data) throw new AppError(404, 'Pesanan tidak ditemukan.');
    response.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}
