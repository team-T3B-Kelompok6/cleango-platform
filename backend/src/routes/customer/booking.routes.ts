import { Router } from 'express';
import {
  createCustomerBooking,
  getAvailability,
  getCustomerBooking,
} from '../../controller/customer/booking.controller.js';
import { authenticate, requireCustomer } from '../../middleware/auth.middleware.js';

export const customerBookingRouter = Router();
customerBookingRouter.use(authenticate, requireCustomer);
customerBookingRouter.get('/availability', getAvailability);
customerBookingRouter.post('/', createCustomerBooking);
customerBookingRouter.get('/:id', getCustomerBooking);
