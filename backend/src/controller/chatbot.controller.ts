import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/AppError.js';
import { replyToChat, type ChatInput } from '../lib/chatbot.js';
import { normalizeChatText } from '../lib/chatbot-text.js';

export async function chat(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = request.body;
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      typeof body.message !== 'string' ||
      !normalizeChatText(body.message) ||
      body.message.length > 2000 ||
      normalizeChatText(body.message).length > 2000
    )
      throw new AppError(400, 'Pesan harus berisi 1–2000 karakter.');
    if (
      Object.keys(body).some(
        (key) => !['message', 'history', 'orderReference'].includes(key),
      )
    )
      throw new AppError(400, 'Field percakapan tidak dikenal.');
    const history = body.history ?? [];
    if (
      !Array.isArray(history) ||
      history.length > 8 ||
      !history.every((entry: unknown) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry))
          return false;
        const item = entry as Record<string, unknown>;
        return (
          Object.keys(item).every((key) => ['role', 'content'].includes(key)) &&
          typeof item.role === 'string' &&
          ['user', 'assistant'].includes(item.role) &&
          typeof item.content === 'string' &&
          normalizeChatText(item.content).length > 0 &&
          item.content.length <= 2000 &&
          normalizeChatText(item.content).length <= 2000
        );
      })
    )
      throw new AppError(
        400,
        'Riwayat maksimal 8 pesan user/assistant, masing-masing 2000 karakter.',
      );
    if (
      body.orderReference !== undefined &&
      (typeof body.orderReference !== 'string' ||
        !/^[a-zA-Z0-9][a-zA-Z0-9/-]{0,49}$/.test(body.orderReference))
    )
      throw new AppError(400, 'Nomor pesanan tidak valid.');
    const input: ChatInput = { message: body.message.trim(), history };
    if (body.orderReference !== undefined)
      input.orderReference = body.orderReference;
    const customerId =
      request.user?.role === 'customer' &&
      Number.isSafeInteger(request.user.id) &&
      request.user.id > 0
        ? request.user.id
        : undefined;
    response.status(200).json({ data: await replyToChat(input, customerId) });
  } catch (error) {
    next(error);
  }
}
