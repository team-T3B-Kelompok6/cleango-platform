import { Router } from 'express';
import {
  getServiceDetail,
  getServiceReviews,
  getServices,
} from '../../controller/customer/service.controller.js';

export const customerServiceRouter = Router();
customerServiceRouter.get('/', getServices);
customerServiceRouter.get('/:id/reviews', getServiceReviews);
customerServiceRouter.get('/:id', getServiceDetail);
