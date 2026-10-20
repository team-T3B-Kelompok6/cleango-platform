import { Router } from 'express';
import {
  getMyNotifications,
  readMyNotification,
} from '../../controller/customer/notification.controller.js';
import { authenticate, requireCustomer } from '../../middleware/auth.middleware.js';

export const customerNotificationRouter = Router();
customerNotificationRouter.use(authenticate, requireCustomer);
customerNotificationRouter.get('/', getMyNotifications);
customerNotificationRouter.patch('/:id/read', readMyNotification);
