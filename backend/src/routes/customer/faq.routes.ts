import { Router } from 'express';
import { getPublishedFaqs } from '../../controller/customer/faq.controller.js';
import { authenticate, requireCustomer } from '../../middleware/auth.middleware.js';

export const customerFaqRouter = Router();
customerFaqRouter.get('/', authenticate, requireCustomer, getPublishedFaqs);
