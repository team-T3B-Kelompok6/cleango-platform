import { Router } from 'express';
import {
  createService,
  deleteService,
  getService,
  getServices,
  updateService,
} from '../controller/service.controller.js';

export const platformServiceRouter = Router();
platformServiceRouter.get('/', getServices);
platformServiceRouter.get('/:id', getService);
platformServiceRouter.post('/', createService);
platformServiceRouter.patch('/:id', updateService);
platformServiceRouter.delete('/:id', deleteService);
