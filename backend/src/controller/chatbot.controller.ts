import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/AppError.js';
import { replyToChat, type ChatInput } from '../lib/chatbot.js';
import { normalizeChatText } from '../lib/chatbot-text.js';
import { getEnv } from '../config/env.js';
import { findServices } from '../model/service.model.js';
import { listChatPromos } from '../model/chatbot.model.js';
import { knowledgeSuggestions } from '../lib/chatbot-knowledge.js';

export async function suggestions(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = [
      { question: 'FAQ', source: 'faq-menu' },
      ...knowledgeSuggestions().map((question) => ({ question, source: 'knowledge' })),
    ];
    const env = getEnv();
    if (env.CHATBOT_DATABASE_ENABLED) {
      const [services, promos] = await Promise.allSettled([
        findServices({ search: null, categoryId: null, activeOnly: true }),
        listChatPromos(),
      ]);
      if (services.status === 'fulfilled')
        data.push(
          ...services.value
            .slice(0, 3)
            .map(({ name }) => ({
              question: `Apa saja yang termasuk ${name}?`,
              source: 'database',
            })),
        );
      if (promos.status === 'fulfilled' && promos.value.length)
        data.push({
          question: 'Promo apa yang sedang berlaku?',
          source: 'database',
        });
    }
    if (request.user?.role === 'customer' && env.CHATBOT_DATABASE_ENABLED)
      data.push({
        question: 'Bagaimana status pesanan saya?',
        source: 'order',
      });
    response.status(200).json({ data: data.slice(0, 8) });
  } catch (error) {
    next(error);
  }
}

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
        (key) => !['message', 'history', 'orderReference', 'faqIds'].includes(key),
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
    if (
      body.faqIds !== undefined &&
      (!Array.isArray(body.faqIds) ||
        body.faqIds.length > 5 ||
        new Set(body.faqIds).size !== body.faqIds.length ||
        !body.faqIds.every((id: unknown) =>
          typeof id === 'string' && /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)),
        ))
    )
      throw new AppError(400, 'FAQ maksimal 5 ID positif unik.');
    const input: ChatInput = { message: body.message.trim(), history };
    if (body.faqIds !== undefined) input.faqIds = body.faqIds;
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
