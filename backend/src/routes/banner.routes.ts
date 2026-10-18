import { Router, raw } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';
import {
  createBanner,
  deleteBanner,
  getBanner,
  getBanners,
  updateBanner,
  uploadImage,
} from '../controller/banner.controller.js';

export const bannerRouter = Router();
bannerRouter.use(authenticate, requireAdmin);
bannerRouter.get('/', getBanners);
bannerRouter.get('/:id', getBanner);
bannerRouter.post('/', createBanner);
bannerRouter.patch('/:id', updateBanner);
bannerRouter.delete('/:id', deleteBanner);

export const uploadRouter = Router();
uploadRouter.use(authenticate, requireAdmin);
uploadRouter.post(
  '/',
  raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '2mb' }),
  uploadImage,
);