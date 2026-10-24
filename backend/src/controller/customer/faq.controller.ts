import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../lib/AppError.js';
import { incrementFaqView, listPublishedFaqs } from '../../model/faq.model.js';
import { positiveId } from '../resource-validation.js';

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

/** Records one read of a FAQ (drives the "popular questions" ranking). */
export async function recordFaqView(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const viewCount = await incrementFaqView(
      positiveId(request.params.id, 'ID FAQ'),
    );
    if (viewCount === null) throw new AppError(404, 'FAQ tidak ditemukan.');
    response.status(200).json({ data: { id: String(request.params.id), viewCount } });
  } catch (error) {
    next(error);
  }
}
