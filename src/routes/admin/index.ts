import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/admin.middleware.js';
import { adminAuthRouter } from './auth.routes.js';
import { adminCategoryRouter } from './category.routes.js';
import { adminServiceRouter } from './service.routes.js';

export const adminRouter = Router();
adminRouter.use('/auth', adminAuthRouter);
adminRouter.use(authenticate, requireAdmin);
adminRouter.use('/categories', adminCategoryRouter);
adminRouter.use('/services', adminServiceRouter);
