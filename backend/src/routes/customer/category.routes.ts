import { Router } from 'express';
import {
  getCategories,
  getCategoryDetail,
  getPopularCategories,
} from '../../controller/customer/category.controller.js';

export const customerCategoryRouter = Router();
customerCategoryRouter.get('/', getCategories);
// Registered before '/:id' so "popular" is not treated as an id.
customerCategoryRouter.get('/popular', getPopularCategories);
customerCategoryRouter.get('/:id', getCategoryDetail);
