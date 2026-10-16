import bcrypt from 'bcrypt';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../lib/AppError.js';
import {
  findUserByEmail,
  findUserById,
  updateUserPassword,
  updateUserProfile,
} from '../../model/user.model.js';

function customerId(request: Request): number {
  if (!request.user) throw new AppError(401, 'Authentication diperlukan', 'AUTH_REQUIRED');
  return request.user.id;
}

function profileData(user: { id: number; name: string; email: string; phone: string | null; role: string }) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
}

export async function getProfile(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const user = await findUserById(customerId(request));
    if (!user || user.role !== 'customer') throw new AppError(404, 'Customer tidak ditemukan');
    response.status(200).json({ data: profileData(user) });
  } catch (error) { next(error); }
}

export async function updateProfile(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const id = customerId(request);
    const user = await findUserById(id);
    if (!user || user.role !== 'customer') throw new AppError(404, 'Customer tidak ditemukan');

    const body = request.body as Record<string, unknown>;
    if (body.role !== undefined) throw new AppError(400, 'Role tidak boleh diubah');

    const name = body.name !== undefined ? String(body.name).trim() : undefined;
    const email = body.email !== undefined ? String(body.email).trim().toLowerCase() : undefined;
    const phone = body.phone !== undefined ? String(body.phone).replace(/[^0-9]/g, '') : undefined;

    if (name !== undefined && !name) throw new AppError(400, 'Nama wajib diisi');
    if (email !== undefined && !/^\S+@\S+\.\S+$/.test(email)) throw new AppError(400, 'Email tidak valid');
    if (phone !== undefined && (phone.length < 9 || phone.length > 15)) throw new AppError(400, 'Nomor telepon tidak valid');

    if (email !== undefined && email !== user.email) {
      const existing = await findUserByEmail(email);
      if (existing && existing.id !== id) throw new AppError(400, 'Email sudah terdaftar');
    }

    const changes: { name?: string; email?: string; phone?: string } = {};
    if (name !== undefined) changes.name = name;
    if (email !== undefined) changes.email = email;
    if (phone !== undefined) changes.phone = phone;
    const updated = await updateUserProfile(id, changes);
    response.status(200).json({ message: 'Profil berhasil diperbarui', data: profileData(updated) });
  } catch (error) { next(error); }
}

export async function changePassword(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const id = customerId(request);
    const user = await findUserById(id);
    if (!user || user.role !== 'customer') throw new AppError(404, 'Customer tidak ditemukan');

    const body = request.body as Record<string, unknown>;
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    if (!currentPassword) throw new AppError(400, 'Password lama wajib diisi');
    if (newPassword.length < 6) throw new AppError(400, 'Password baru minimal 6 karakter');
    if (newPassword.length > 72) throw new AppError(400, 'Password baru maksimal 72 karakter');

    if (!await bcrypt.compare(currentPassword, user.passwordHash)) {
      throw new AppError(401, 'Password lama salah');
    }

    await updateUserPassword(id, await bcrypt.hash(newPassword, 12));
    response.status(200).json({ message: 'Password berhasil diperbarui' });
  } catch (error) { next(error); }
}
