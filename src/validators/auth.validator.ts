import { z } from 'zod';

const email = z.string().trim().email();
const password = z.string().min(8).max(72);

export const registerSchema = z.object({
  email,
  password,
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(24).optional(),
}).strict();

export const loginSchema = z.object({ email, password }).strict();
export const forgotPasswordSchema = z.object({ email }).strict();
