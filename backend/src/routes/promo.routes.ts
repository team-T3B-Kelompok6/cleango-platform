import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';
import {
  createPromo,
  deletePromo,
  getPromo,
  getPromos,
  updatePromo,
} from '../controller/promo.controller.js';

export const promoRouter = Router();
promoRouter.use(authenticate, requireAdmin);
promoRouter.get('/', getPromos);
promoRouter.get('/:id', getPromo);
promoRouter.post('/', createPromo);
promoRouter.patch('/:id', updatePromo);
promoRouter.delete('/:id', deletePromo);