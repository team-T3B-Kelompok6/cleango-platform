import cors from 'cors';
import express from 'express';
import { getEnv } from './config/env.js';
import { requestLogger } from './lib/logger.js';
import { globalErrorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { apiRouter } from './routes/index.js';
import { UPLOAD_DIR } from './controller/banner.controller.js';
import { postPaymentWebhook } from './controller/payment.controller.js';

export function createApp() {
  const app = express();
  const env = getEnv();

  app.use(cors({ origin: env.FRONTEND_ORIGIN }));
  // Signature checks need the untouched body, so mount before the JSON parser.
  app.post(
    '/api/payments/webhook',
    express.raw({ type: 'application/json', limit: '100kb' }),
    postPaymentWebhook,
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);
  app.get('/health', (_request, response) => response.status(200).json({ message: 'CleanGo API sehat' }));
  app.use(
    `/${UPLOAD_DIR}`,
    express.static(UPLOAD_DIR, { fallthrough: false, index: false, maxAge: '7d' }),
  );
  app.use('/api', apiRouter);
  app.use(notFoundHandler);
  app.use(globalErrorHandler);
  return app;
}
