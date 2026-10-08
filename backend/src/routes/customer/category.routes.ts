import { Router } from 'express';
import { getCategories, getCategoryDetail } from '../../controller/customer/category.controller.js';

export const customerCategoryRouter = Router();
customerCategoryRouter.get('/', getCategories);
customerCategoryRouter.get('/:id', getCategoryDetail);
