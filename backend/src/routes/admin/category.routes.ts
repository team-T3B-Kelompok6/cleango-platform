import { Router } from 'express';
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryDetail,
  updateCategory,
} from '../../controller/admin/category.controller.js';

export const adminCategoryRouter = Router();
adminCategoryRouter.get('/', getCategories);
adminCategoryRouter.get('/:id', getCategoryDetail);
adminCategoryRouter.post('/', createCategory);
adminCategoryRouter.patch('/:id', updateCategory);
adminCategoryRouter.delete('/:id', deleteCategory);
