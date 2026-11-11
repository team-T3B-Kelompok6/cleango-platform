import { Router, raw } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';
import { uploadImage } from '../controller/banner.controller.js';

export const uploadRouter = Router();
uploadRouter.use(authenticate, requireAdmin);
uploadRouter.post(
  '/',
  raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '2mb' }),
  uploadImage,
);