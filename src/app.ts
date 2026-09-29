import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { getEnv } from './config/env.js';
import { globalErrorHandler } from './middlewares/error-handler.js';
import { notFoundHandler } from './middlewares/not-found.js';
import { apiRouter } from './routes/index.js';
import { sendSuccess } from './utils/response.js';

export function createApp() {
  const app = express();
  const env = getEnv();
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 200, standardHeaders: 'draft-8' }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_request, response) => sendSuccess(response, { status: 'ok' }, 'CleanGo API is healthy'));
  app.use('/api/v1', apiRouter);
  app.use(notFoundHandler);
  app.use(globalErrorHandler);
  return app;
}
