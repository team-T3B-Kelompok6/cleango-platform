import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { bookingQuerySchema, createBookingSchema } from '../validators/booking.validator.js';
import { uuidParamSchema } from '../validators/common.validator.js';

export const bookingRouter = Router();
bookingRouter.use(authenticate);
bookingRouter.post('/', validate(createBookingSchema), asyncHandler(bookingController.create));
bookingRouter.get('/', validate(bookingQuerySchema, 'query'), asyncHandler(bookingController.list));
bookingRouter.get('/active', asyncHandler(bookingController.active));
bookingRouter.post('/:id/cancel', validate(uuidParamSchema, 'params'), asyncHandler(bookingController.cancel));
bookingRouter.get('/:id', validate(uuidParamSchema, 'params'), asyncHandler(bookingController.detail));
