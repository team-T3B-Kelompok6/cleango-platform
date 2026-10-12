import { Router } from 'express';
import { getOrder, getOrders } from '../controller/order.controller.js';

export const orderRouter = Router();
orderRouter.get('/', getOrders);
orderRouter.get('/:id', getOrder);
