import { Router } from 'express';
import {
  createOrder,
  deleteOrder,
  getOrder,
  getOrders,
  updateOrder,
} from '../controller/order.controller.js';

export const orderRouter = Router();
orderRouter.get('/', getOrders);
orderRouter.get('/:id', getOrder);
orderRouter.post('/', createOrder);
orderRouter.patch('/:id', updateOrder);
orderRouter.delete('/:id', deleteOrder);