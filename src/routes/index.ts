import { Router } from 'express';
import { addressRouter } from './address.routes.js';
import { authRouter } from './auth.routes.js';
import { bookingRouter } from './booking.routes.js';
import { catalogRouter } from './catalog.routes.js';

export const apiRouter = Router();
apiRouter.use('/auth', authRouter);
apiRouter.use(catalogRouter);
apiRouter.use('/addresses', addressRouter);
apiRouter.use('/bookings', bookingRouter);
