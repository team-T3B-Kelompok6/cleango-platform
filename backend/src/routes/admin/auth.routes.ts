import { Router } from 'express';
import { login, me } from '../../controller/admin/auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/admin.middleware.js';

export const adminAuthRouter = Router();
adminAuthRouter.post('/login', login);
adminAuthRouter.get('/me', authenticate, requireAdmin, me);
