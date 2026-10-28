import { Router, raw } from 'express';
import {
  createCustomerBooking,
  getAvailability,
  getCustomerBooking,
  listMyBookings,
} from '../../controller/customer/booking.controller.js';
import {
  authenticate,
  requireCustomer,
} from '../../middleware/auth.middleware.js';
import { getCustomerEta } from '../../controller/tracking.controller.js';
import {
  deleteBookingReviewPhotoHandler,
  getBookingReview,
  postBookingReview,
  postBookingReviewPhoto,
  putBookingReview,
} from '../../controller/customer/review.controller.js';
import { payBooking } from '../../controller/customer/payment.controller.js';

export const customerBookingRouter = Router();
customerBookingRouter.use(authenticate, requireCustomer);
customerBookingRouter.get('/availability', getAvailability);
customerBookingRouter.get('/', listMyBookings);
customerBookingRouter.post('/', createCustomerBooking);
customerBookingRouter.get('/:id/review', getBookingReview);
customerBookingRouter.post('/:id/review', postBookingReview);
customerBookingRouter.put('/:id/review', putBookingReview);
customerBookingRouter.patch('/:id/review', putBookingReview);
customerBookingRouter.post(
  '/:id/review/photos',
  raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '2mb' }),
  postBookingReviewPhoto,
);
customerBookingRouter.delete(
  '/:id/review/photos/:photoId',
  deleteBookingReviewPhotoHandler,
);
customerBookingRouter.post('/:id/pay', payBooking);
customerBookingRouter.get('/:id/tracking', getCustomerEta);
customerBookingRouter.get('/:id', getCustomerBooking);
