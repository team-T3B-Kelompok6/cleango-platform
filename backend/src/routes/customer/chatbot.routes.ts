import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { chat } from '../../controller/chatbot.controller.js';

export const customerChatbotRouter = Router();
const limits = new Map<string, { count: number; until: number }>();
customerChatbotRouter.post(
  '/',
  (request, response, next) => {
    const now = Date.now();
    if (limits.size >= 5000)
      for (const [key, item] of limits)
        if (item.until <= now) limits.delete(key);
    const key = request.ip ?? 'unknown';
    const entry = limits.get(key);
    if (entry && entry.until > now) {
      if (entry.count >= 10) {
        response.setHeader(
          'Retry-After',
          Math.ceil((entry.until - now) / 1000),
        );
        response
          .status(429)
          .json({
            message: 'Terlalu banyak pesan. Tunggu sebentar lalu coba lagi.',
          });
        return;
      }
      entry.count++;
    } else {
      if (limits.size >= 5000) {
        response
          .status(503)
          .json({ message: 'Chat sedang sibuk. Coba lagi sebentar.' });
        return;
      }
      limits.set(key, { count: 1, until: now + 60_000 });
    }
    // Public knowledge is available to guests; supplied tokens must still be valid.
    if (request.header('authorization')) authenticate(request, response, next);
    else next();
  },
  chat,
);
