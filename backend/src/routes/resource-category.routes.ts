import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';
import { getCategoriesByResource } from '../controller/category.controller.js';

export const resourceCategoryRouter = Router();
resourceCategoryRouter.use(authenticate, requireAdmin);
resourceCategoryRouter.get('/', getCategoriesByResource);