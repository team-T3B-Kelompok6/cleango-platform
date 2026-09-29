import { z } from 'zod';
import { paginationSchema } from './common.validator.js';

export const serviceQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(100).optional(),
  categoryId: z.string().uuid().optional(),
});
