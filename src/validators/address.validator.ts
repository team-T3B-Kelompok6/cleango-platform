import { z } from 'zod';

export const createAddressSchema = z.object({
  label: z.string().trim().min(1).max(50),
  recipientName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(24),
  address: z.string().trim().min(5).max(500),
  city: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(3).max(12),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = createAddressSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
);
