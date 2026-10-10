import { Router } from 'express';
import { platformLogin } from '../controller/admin/auth.controller.js';

export const authRouter = Router();

authRouter.post('/login', platformLogin);
