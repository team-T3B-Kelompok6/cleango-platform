import bcrypt from 'bcrypt';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../lib/AppError.js';
import { createAccessToken } from '../../lib/jwt.js';
import { findUserByEmail, findUserById, insertCustomer, type User } from '../../model/user.model.js';

function publicUser(user: User) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
}

function credentials(body: Record<string, unknown>): { email: string; password: string } {
  if (typeof body.email !== 'string' || !/^\S+@\S+\.\S+$/.test(body.email.trim())) {
    throw new AppError(400, 'Email tidak valid');
  }
  if (typeof body.password !== 'string' || body.password.length < 8) {
    throw new AppError(400, 'Password minimal 8 karakter');
  }
  return { email: body.email.trim().toLowerCase(), password: body.password };
}

export async function register(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const body = request.body as Record<string, unknown>;
    if (body.role !== undefined) throw new AppError(400, 'Role tidak boleh dikirim saat registrasi');
    const { email, password } = credentials(body);
    if (typeof body.name !== 'string' || !body.name.trim()) throw new AppError(400, 'Nama wajib diisi');
    if (await findUserByEmail(email)) throw new AppError(400, 'Email sudah terdaftar');
    const phone = body.phone === undefined || body.phone === null || body.phone === ''
      ? null
      : String(body.phone).trim();
    const user = await insertCustomer({
      name: body.name.trim(),
      email,
      passwordHash: await bcrypt.hash(password, 12),
      phone,
    });
    response.status(201).json({
      message: 'Registrasi berhasil',
      data: { user: publicUser(user), token: createAccessToken(user) },
    });
  } catch (error) { next(error); }
}

export async function login(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = credentials(request.body as Record<string, unknown>);
    const user = await findUserByEmail(email);
    if (!user || user.role !== 'customer' || !await bcrypt.compare(password, user.passwordHash)) {
      throw new AppError(401, 'Email atau password salah');
    }
    response.status(200).json({
      message: 'Login berhasil',
      data: { user: publicUser(user), token: createAccessToken(user) },
    });
  } catch (error) { next(error); }
}

export async function me(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.user) throw new AppError(401, 'Authentication diperlukan');
    const user = await findUserById(request.user.id);
    if (!user) throw new AppError(404, 'User tidak ditemukan');
    response.status(200).json({ data: publicUser(user) });
  } catch (error) { next(error); }
}
