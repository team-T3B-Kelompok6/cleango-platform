import { z } from 'zod';
import { paginationSchema } from './common.validator.js';

export const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  addressId: z.string().uuid(),
  bookingDate: z.iso.date(),
  bookingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/),
  notes: z.string().trim().max(1000).nullable().optional(),
  promoCode: z.string().trim().min(3).max(40).nullable().optional(),
}).strict();

export const bookingQuerySchema = paginationSchema.extend({
  status: z.enum([
    'pending', 'confirmed', 'cleaner_assigned', 'departed', 'on_the_way',
    'arrived', 'cleaning', 'completed', 'cancelled', 'delayed', 'no_show',
  ]).optional(),
});
