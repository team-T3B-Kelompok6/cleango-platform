import type { NextFunction, Request, Response } from 'express';
import { listBanners } from '../../model/banner.model.js';

export async function getCustomerBanners(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.status(200).json({ data: await listBanners() });
  } catch (error) {
    next(error);
  }
}
