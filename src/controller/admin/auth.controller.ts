import bcrypt from 'bcrypt';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../lib/AppError.js';
import { createAccessToken } from '../../lib/jwt.js';
import { findUserByEmail, findUserById, type User } from '../../model/user.model.js';

function publicUser(user: User) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
}

export async function login(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const body = request.body as Record<string, unknown>;
    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
      throw new AppError(400, 'Email dan password wajib diisi');
    }
    const user = await findUserByEmail(body.email.trim().toLowerCase());
    if (!user || user.role !== 'admin' || !await bcrypt.compare(body.password, user.passwordHash)) {
      throw new AppError(401, 'Email atau password admin salah');
    }
    response.status(200).json({
      message: 'Login admin berhasil',
      data: { user: publicUser(user), token: createAccessToken(user) },
    });
  } catch (error) { next(error); }
}

export async function me(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.user) throw new AppError(401, 'Authentication diperlukan');
    const user = await findUserById(request.user.id);
    if (!user || user.role !== 'admin') throw new AppError(404, 'Admin tidak ditemukan');
    response.status(200).json({ data: publicUser(user) });
  } catch (error) { next(error); }
}
