import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';
import {
  deleteCustomer,
  getCustomer,
  getCustomers,
  updateCustomer,
} from '../controller/customer/customer.controller.js';

export const customerListRouter = Router();
customerListRouter.use(authenticate, requireAdmin);
customerListRouter.get('/', getCustomers);
customerListRouter.get('/:id', getCustomer);
customerListRouter.patch('/:id', updateCustomer);
customerListRouter.delete('/:id', deleteCustomer);
