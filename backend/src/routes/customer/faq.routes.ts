import { Router } from 'express';
import {
  getPublishedFaqs,
  recordFaqView,
} from '../../controller/customer/faq.controller.js';
import { authenticate, requireCustomer } from '../../middleware/auth.middleware.js';

export const customerFaqRouter = Router();
customerFaqRouter.use(authenticate, requireCustomer);
customerFaqRouter.get('/', getPublishedFaqs);
customerFaqRouter.post('/:id/view', recordFaqView);
