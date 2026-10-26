import bcrypt from 'bcrypt';
import type { NextFunction, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { AppError } from '../../lib/AppError.js';
import {
  ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  createAccessToken,
  createResetToken,
  verifyResetToken,
} from '../../lib/jwt.js';
import {
  findOrCreateSocialCustomer,
  findUserByEmail,
  findUserById,
  findUserByPhone,
  insertCustomer,
  updateUserPassword,
  type User,
} from '../../model/user.model.js';

function publicUser(user: User) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('62')) {
    cleaned = '0' + cleaned.substring(2);
  } else if (!cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

export async function register(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const body = request.body as Record<string, unknown>;
    if (body.role !== undefined) throw new AppError(400, 'Role tidak boleh dikirim saat registrasi');

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phoneInput = typeof body.phone === 'string' ? body.phone.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!name) throw new AppError(400, 'Nama wajib diisi');
    if (!phoneInput) throw new AppError(400, 'Nomor telepon wajib diisi');
    const phone = normalizePhone(phoneInput);
    if (phone.length < 9 || phone.length > 15) {
      throw new AppError(400, 'Nomor telepon tidak valid');
    }

    // Email opsional untuk registrasi mobile, default fallback jika kosong
    let finalEmail = email;
    if (!finalEmail) {
      finalEmail = `${phone}@cleango.customer.local`;
    } else if (!/^\S+@\S+\.\S+$/.test(finalEmail)) {
      throw new AppError(400, 'Email tidak valid');
    }

    if (password.length < 8) {
      throw new AppError(400, 'Password minimal 8 karakter');
    }

    if (await findUserByPhone(phone)) throw new AppError(400, 'Nomor telepon sudah terdaftar');
    if (await findUserByEmail(finalEmail)) throw new AppError(400, 'Email sudah terdaftar');

    const user = await insertCustomer({
      name,
      email: finalEmail,
      passwordHash: await bcrypt.hash(password, 12),
      phone,
    });

    response.status(201).json({
      message: 'Registrasi berhasil',
      data: {
        user: publicUser(user),
        token: createAccessToken(user),
        expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      },
    });
  } catch (error) { next(error); }
}

export async function login(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const body = request.body as Record<string, unknown>;
    const identifier = String(body.phone ?? body.email ?? body.identifier ?? '').trim();
    const password = typeof body.password === 'string' ? body.password : '';

    if (!identifier) throw new AppError(400, 'Nomor telepon atau email wajib diisi');
    if (!password) throw new AppError(400, 'Password wajib diisi');

    let user: User | null = null;
    if (identifier.includes('@')) {
      user = await findUserByEmail(identifier.toLowerCase());
    } else {
      user = await findUserByPhone(normalizePhone(identifier));
    }

    if (!user || user.role !== 'customer' || !await bcrypt.compare(password, user.passwordHash)) {
      throw new AppError(401, 'Nomor telepon/email atau password salah');
    }

    response.status(200).json({
      message: 'Login berhasil',
      data: {
        user: publicUser(user),
        token: createAccessToken(user),
        expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      },
    });
  } catch (error) { next(error); }
}

export async function me(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.user) throw new AppError(401, 'Authentication diperlukan');
    const user = await findUserById(request.user.id);
    if (!user || user.role !== 'customer') throw new AppError(404, 'Customer tidak ditemukan');
    response.status(200).json({ data: publicUser(user) });
  } catch (error) { next(error); }
}

export function logout(_request: Request, response: Response): void {
  response.status(200).json({ message: 'Logout berhasil, hapus token dari penyimpanan aplikasi' });
}

// ponytail: social login dummy untuk demo kampus — belum memverifikasi token OAuth asli.
// Ganti dengan verifikasi id_token Google / access_token Facebook saat kredensial tersedia.
export async function socialLogin(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const body = request.body as Record<string, unknown>;
    const provider = typeof body.provider === 'string' ? body.provider.trim().toLowerCase() : '';
    let email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    let name = typeof body.name === 'string' ? body.name.trim() : '';
    const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';

    if (provider !== 'google' && provider !== 'facebook') {
      throw new AppError(400, 'Provider harus google atau facebook');
    }

    if (provider === 'google') {
      if (!idToken) throw new AppError(401, 'Google ID token wajib diisi');

      const audience = [
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
      ].filter((id): id is string => typeof id === 'string' && id.length > 0);

      try {
        if (audience.length === 0) {
          throw new AppError(503, 'Google OAuth belum dikonfigurasi');
        }
        const client = new OAuth2Client();
        const ticket = await client.verifyIdToken({ idToken, audience });
        const payload = ticket.getPayload();
        if (!payload) {
          throw new AppError(401, 'Token Google tidak valid');
        }
        if (!payload?.email) {
          throw new AppError(401, 'Token Google tidak berisi email valid');
        }
        email = payload.email.toLowerCase();
        name = (payload.name ?? name ?? email.split('@')[0] ?? email).trim();
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(401, 'Verifikasi Google ID token gagal');
      }
    }

    if (provider === 'facebook') {
      if (!accessToken) throw new AppError(401, 'Facebook access token wajib diisi');

      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;

      try {
        if (appId && appSecret) {
          const debugUrl = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appId)}|${encodeURIComponent(appSecret)}`;
          const debugRes = await fetch(debugUrl);
          if (!debugRes.ok) throw new AppError(401, 'Verifikasi token Facebook gagal');
          const debugData = (await debugRes.json()) as { data?: { is_valid?: boolean; app_id?: string } };
          if (!debugData.data?.is_valid || debugData.data?.app_id !== appId) {
            throw new AppError(401, 'Token Facebook tidak valid atau tidak cocok dengan aplikasi');
          }
        }

        const meUrl = `https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`;
        const meRes = await fetch(meUrl);
        if (!meRes.ok) throw new AppError(401, 'Gagal mengambil data profil Facebook');
        const meData = (await meRes.json()) as { id?: string; name?: string; email?: string };
        if (!meData.id) throw new AppError(401, 'Data akun Facebook tidak valid');

        email = (meData.email ?? email ?? `${meData.id}@facebook.cleango.local`).toLowerCase();
        name = (meData.name ?? name ?? email.split('@')[0] ?? 'Pengguna Facebook').trim();
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(401, 'Verifikasi Facebook access token gagal');
      }
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new AppError(400, 'Email tidak valid');

    const user = await findOrCreateSocialCustomer({
      provider,
      email,
      name: name || email.split('@')[0] || email,
    });

    if (user.role !== 'customer') throw new AppError(401, 'Akun ini bukan akun customer');

    response.status(200).json({
      message: 'Login berhasil',
      data: {
        user: publicUser(user),
        token: createAccessToken(user),
        expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      },
    });
  } catch (error) { next(error); }
}

// ponytail: reset dummy untuk development; ganti pengiriman email/SMS saat provider terpasang
export async function forgotPassword(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const body = request.body as Record<string, unknown>;
    const identifier = String(body.phone ?? body.email ?? body.identifier ?? '').trim();
    if (!identifier) throw new AppError(400, 'Nomor telepon atau email wajib diisi');

    const user = identifier.includes('@')
      ? await findUserByEmail(identifier.toLowerCase())
      : await findUserByPhone(normalizePhone(identifier));

    if (!user || user.role !== 'customer') {
      // Non-enumerasi: selalu 200 agar tidak membocorkan keberadaan akun
      response.status(200).json({
        message: 'Jika akun terdaftar, instruksi reset telah disiapkan',
      });
      return;
    }

    const resetToken = createResetToken(user.id);
    response.status(200).json({
      message: 'Instruksi reset telah disiapkan (mode dev)',
      data: { resetToken },
    });
  } catch (error) { next(error); }
}

export async function resetPassword(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const body = request.body as Record<string, unknown>;
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!token) throw new AppError(400, 'Token reset wajib diisi');
    if (newPassword.length < 8) throw new AppError(400, 'Password baru minimal 8 karakter');

    let payload;
    try {
      payload = verifyResetToken(token);
    } catch {
      throw new AppError(400, 'Token reset tidak valid atau sudah kedaluwarsa');
    }

    const user = await findUserById(payload.id);
    if (!user || user.role !== 'customer') {
      throw new AppError(404, 'User tidak ditemukan');
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await updateUserPassword(user.id, hash);

    response.status(200).json({
      message: 'Password berhasil diperbarui, silakan login dengan password baru',
    });
  } catch (error) { next(error); }
}
