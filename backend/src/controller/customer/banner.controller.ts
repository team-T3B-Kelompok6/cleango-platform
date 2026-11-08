import type { NextFunction, Request, Response } from 'express';
import { listPromoBanners } from '../../model/promo.model.js';

export async function getCustomerBanners(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.status(200).json({ data: await listPromoBanners() });
  } catch (error) {
    next(error);
  }
}
