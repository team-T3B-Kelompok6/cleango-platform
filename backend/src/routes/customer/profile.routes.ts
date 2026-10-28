import { Router, raw } from 'express';
import {
  changePassword,
  getProfile,
  updateProfile,
  updateProfilePhoto,
} from '../../controller/customer/profile.controller.js';
import { authenticate, requireCustomer } from '../../middleware/auth.middleware.js';

export const customerProfileRouter = Router();
customerProfileRouter.use(authenticate, requireCustomer);
customerProfileRouter.get('/', getProfile);
customerProfileRouter.patch('/', updateProfile);
customerProfileRouter.post(
  '/photo',
  raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '2mb' }),
  updateProfilePhoto,
);
customerProfileRouter.patch('/password', changePassword);
