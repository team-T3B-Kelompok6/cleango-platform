import { Router } from 'express';
import { adminRouter } from './admin/index.js';
import { authRouter } from './auth.routes.js';
import { customerRouter } from './customer/index.js';

export const apiRouter = Router();
apiRouter.use('/auth', authRouter);
apiRouter.use('/customer', customerRouter);
apiRouter.use('/admin', adminRouter);
