import { Router } from 'express';
import { getCustomerBanners } from '../../controller/customer/banner.controller.js';
import { authenticate, requireCustomer } from '../../middleware/auth.middleware.js';

export const customerBannerRouter = Router();
customerBannerRouter.get('/', authenticate, requireCustomer, getCustomerBanners);
