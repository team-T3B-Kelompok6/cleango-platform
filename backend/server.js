import 'dotenv/config';

import cors from 'cors';
import express from 'express';

import { errorHandler, notFoundHandler } from './src/lib/error-handler.js';
import { requestLogger } from './src/lib/request-logger.js';
import healthRouter from './src/routes/health-route.js';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

app.disable('x-powered-by');
app.use(cors({ origin: frontendUrl }));
app.use(express.json());
app.use(requestLogger);

app.use('/api/health', healthRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Backend berjalan di http://localhost:${port}`);
});

