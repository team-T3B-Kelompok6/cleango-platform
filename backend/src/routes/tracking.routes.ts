import { Router } from 'express';
import { getEnv } from '../config/env.js';
import {
  calculateEta,
  calculateRisk,
  calculateWorkDuration,
} from '../controller/tracking.controller.js';
import { AppError } from '../lib/AppError.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const trackingRouter = Router();

trackingRouter.post('/eta', authenticate, calculateEta);
trackingRouter.post('/risk', authenticate, calculateRisk);
trackingRouter.post('/work-duration', authenticate, calculateWorkDuration);
trackingRouter.post('/eta-preview', (request, response, next) => {
  // shortcut: local demo until Flutter authentication uses the backend; disabled in production.
  if (getEnv().NODE_ENV === 'production') {
    next(new AppError(404, 'Endpoint tidak ditemukan'));
    return;
  }
  void calculateEta(request, response, next);
});
trackingRouter.post('/risk-preview', (request, response, next) => {
  // shortcut: local dashboard demo until live cleaner tracking exists; disabled in production.
  if (getEnv().NODE_ENV === 'production') {
    next(new AppError(404, 'Endpoint tidak ditemukan'));
    return;
  }
  void calculateRisk(request, response, next);
});
trackingRouter.post('/work-duration-preview', (request, response, next) => {
  // shortcut: local demo until service progress is connected to authenticated orders.
  if (getEnv().NODE_ENV === 'production') {
    next(new AppError(404, 'Endpoint tidak ditemukan'));
    return;
  }
  void calculateWorkDuration(request, response, next);
});
