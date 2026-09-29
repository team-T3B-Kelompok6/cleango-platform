import { Router } from 'express';
import { catalogController } from '../controllers/catalog.controller.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { uuidParamSchema } from '../validators/common.validator.js';
import { serviceQuerySchema } from '../validators/service.validator.js';

export const catalogRouter = Router();
catalogRouter.get('/categories', asyncHandler(catalogController.categories));
catalogRouter.get('/services', validate(serviceQuerySchema, 'query'), asyncHandler(catalogController.services));
catalogRouter.get('/services/:id', validate(uuidParamSchema, 'params'), asyncHandler(catalogController.serviceById));
