import { Router } from 'express';
import {
  getCustomerPromos,
  validateCustomerPromo,
} from '../../controller/customer/promo.controller.js';
import { authenticate, requireCustomer } from '../../middleware/auth.middleware.js';

export const customerPromoRouter = Router();
customerPromoRouter.use(authenticate, requireCustomer);
customerPromoRouter.get('/', getCustomerPromos);
customerPromoRouter.post('/validate', validateCustomerPromo);
