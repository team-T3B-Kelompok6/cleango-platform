import { Router } from 'express';
import { getServiceDetail, getServices } from '../../controller/customer/service.controller.js';

export const customerServiceRouter = Router();
customerServiceRouter.get('/', getServices);
customerServiceRouter.get('/:id', getServiceDetail);
