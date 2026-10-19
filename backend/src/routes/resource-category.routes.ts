import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';
import {
  createCategoryByResource,
  deleteCategoryByResource,
  getCategoriesByResource,
  updateCategoryByResource,
} from '../controller/category.controller.js';

export const resourceCategoryRouter = Router();
resourceCategoryRouter.use(authenticate, requireAdmin);
resourceCategoryRouter.get('/', getCategoriesByResource);
resourceCategoryRouter.post('/', createCategoryByResource);
resourceCategoryRouter.patch('/:id', updateCategoryByResource);
resourceCategoryRouter.delete('/:id', deleteCategoryByResource);