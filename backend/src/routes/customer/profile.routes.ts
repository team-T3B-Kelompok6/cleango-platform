import { Router } from 'express';
import { changePassword, getProfile, updateProfile } from '../../controller/customer/profile.controller.js';
import { authenticate, requireCustomer } from '../../middleware/auth.middleware.js';

export const customerProfileRouter = Router();
customerProfileRouter.use(authenticate, requireCustomer);
customerProfileRouter.get('/', getProfile);
customerProfileRouter.patch('/', updateProfile);
customerProfileRouter.patch('/password', changePassword);
