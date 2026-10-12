import { Router } from 'express';
import { customerAuthRouter } from './auth.routes.js';
import { customerCategoryRouter } from './category.routes.js';
import { customerServiceRouter } from './service.routes.js';

export const customerRouter = Router();
customerRouter.use('/auth', customerAuthRouter);
customerRouter.use('/categories', customerCategoryRouter);
customerRouter.use('/services', customerServiceRouter);
