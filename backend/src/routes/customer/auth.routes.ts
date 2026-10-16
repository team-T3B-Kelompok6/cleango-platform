import { Router } from 'express';
import { forgotPassword, login, logout, me, register, resetPassword, socialLogin } from '../../controller/customer/auth.controller.js';
import { authenticate, requireCustomer } from '../../middleware/auth.middleware.js';

export const customerAuthRouter = Router();
customerAuthRouter.post('/register', register);
customerAuthRouter.post('/login', login);
customerAuthRouter.post('/social-login', socialLogin);
customerAuthRouter.get('/me', authenticate, requireCustomer, me);
customerAuthRouter.post('/logout', authenticate, requireCustomer, logout);
customerAuthRouter.post('/forgot-password', forgotPassword);
customerAuthRouter.post('/reset-password', resetPassword);
