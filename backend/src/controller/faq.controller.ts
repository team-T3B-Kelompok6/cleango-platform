import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import {
  deleteFaqById,
  findFaq,
  insertFaq,
  listFaqs,
  updateFaqById,
  type FaqCategory,
  type FaqInput,
} from '../model/faq.model.js';
import { listFaqCategoryNames } from '../model/category.model.js';
import {
  booleanValue,
  positiveId,
  requiredText,
  requireChanges,
  validationError,
} from './resource-validation.js';

function inputFrom(
  body: Record<string, unknown>,
  partial: boolean,
  faqCategories: string[],
): Partial<FaqInput> {
  let category: FaqCategory | undefined;
  if (!partial || body.category !== undefined) {
    const value = typeof body.category === 'string' ? body.category.trim() : '';
    if (!value || !faqCategories.includes(value))
      validationError({
        category:
          faqCategories.length > 0
            ? `Kategori FAQ tidak valid. Pilih salah satu: ${faqCategories.join(', ')}.`
            : 'Belum ada kategori FAQ. Tambahkan kategori terlebih dahulu.',
      });
    category = value;
  }
  const input: Partial<FaqInput> = {};
  const question = requiredText(body, 'question', 'Pertanyaan', 255, partial);
  const answer = requiredText(body, 'answer', 'Jawaban', 3000, partial);
  const published = booleanValue(
    body,
    'published',
    'Status publikasi',
    partial,
  );
  if (category !== undefined) input.category = category;
  if (question !== undefined) input.question = question;
  if (answer !== undefined) input.answer = answer;
  if (published !== undefined) input.published = published;
  if (partial) requireChanges(input);
  return input;
}
export async function getFaqs(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.status(200).json({ data: await listFaqs() });
  } catch (error) {
    next(error);
  }
}
export async function getFaq(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await findFaq(positiveId(request.params.id, 'ID FAQ'));
    if (!data) throw new AppError(404, 'FAQ tidak ditemukan.');
    response.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}
export async function createFaq(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await insertFaq(
      inputFrom(
        request.body as Record<string, unknown>,
        false,
        await listFaqCategoryNames(),
      ) as FaqInput,
    );
    response.status(201).json({ message: 'FAQ berhasil dibuat.', data });
  } catch (error) {
    next(error);
  }
}
export async function updateFaq(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await updateFaqById(
      positiveId(request.params.id, 'ID FAQ'),
      inputFrom(
        request.body as Record<string, unknown>,
        true,
        request.body.category === undefined ? [] : await listFaqCategoryNames(),
      ),
    );
    if (!data) throw new AppError(404, 'FAQ tidak ditemukan.');
    response.status(200).json({ message: 'FAQ berhasil diperbarui.', data });
  } catch (error) {
    next(error);
  }
}
export async function deleteFaq(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!(await deleteFaqById(positiveId(request.params.id, 'ID FAQ'))))
      throw new AppError(404, 'FAQ tidak ditemukan.');
    response.status(200).json({ message: 'FAQ berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
}
