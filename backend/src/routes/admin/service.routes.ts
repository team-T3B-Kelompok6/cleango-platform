import { Router } from 'express';
import {
  createService,
  deleteService,
  getServiceDetail,
  getServices,
  updateService,
} from '../../controller/admin/service.controller.js';

export const adminServiceRouter = Router();
adminServiceRouter.get('/', getServices);
adminServiceRouter.get('/:id', getServiceDetail);
adminServiceRouter.post('/', createService);
adminServiceRouter.patch('/:id', updateService);
adminServiceRouter.delete('/:id', deleteService);
