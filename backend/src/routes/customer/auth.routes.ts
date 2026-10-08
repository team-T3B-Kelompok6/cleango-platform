import { Router } from 'express';
import { login, me, register } from '../../controller/customer/auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

export const customerAuthRouter = Router();
customerAuthRouter.post('/register', register);
customerAuthRouter.post('/login', login);
customerAuthRouter.get('/me', authenticate, me);
