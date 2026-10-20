import type { NextFunction, Request, Response } from 'express';
import { listPublishedFaqs } from '../../model/faq.model.js';

export async function getPublishedFaqs(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.status(200).json({ data: await listPublishedFaqs() });
  } catch (error) {
    next(error);
  }
}
