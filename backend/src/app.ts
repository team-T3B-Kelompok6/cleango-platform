import cors from 'cors';
import express from 'express';
import { getEnv } from './config/env.js';
import { requestLogger } from './lib/logger.js';
import { globalErrorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { apiRouter } from './routes/index.js';

export function createApp() {
  const app = express();
  const env = getEnv();

  app.use(cors({ origin: env.FRONTEND_ORIGIN }));
  app.use(express.json());
  app.use(requestLogger);
  app.get('/health', (_request, response) => response.status(200).json({ message: 'CleanGo API sehat' }));
  app.use('/api', apiRouter);
  app.use(notFoundHandler);
  app.use(globalErrorHandler);
  return app;
}
