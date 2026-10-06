import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';
import type { User, UserRole } from '../model/user.model.js';

export interface TokenPayload {
  id: number;
  email: string;
  role: UserRole;
}

export function createAccessToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role } satisfies TokenPayload,
    getEnv().JWT_SECRET,
    { expiresIn: '7d' },
  );
}

export function verifyAccessToken(token: string): TokenPayload {
  const payload = jwt.verify(token, getEnv().JWT_SECRET);
  if (
    typeof payload === 'string'
    || typeof payload.id !== 'number'
    || typeof payload.email !== 'string'
    || (payload.role !== 'customer' && payload.role !== 'admin')
  ) {
    throw new Error('Payload token tidak valid');
  }
  return { id: payload.id, email: payload.email, role: payload.role };
}
