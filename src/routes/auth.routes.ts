import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { forgotPasswordSchema, loginSchema, registerSchema } from '../validators/auth.validator.js';

export const authRouter = Router();
authRouter.post('/register', validate(registerSchema), asyncHandler(authController.register));
authRouter.post('/login', validate(loginSchema), asyncHandler(authController.login));
authRouter.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
authRouter.post('/logout', authenticate, asyncHandler(authController.logout));
authRouter.get('/me', authenticate, asyncHandler(authController.me));
