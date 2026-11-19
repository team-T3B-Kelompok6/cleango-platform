import 'server-only';
import { ApiError, post } from '@/lib/api';
import type { LoginCredentials, LoginSession } from '../data/authTypes';
import { isLoginSession } from '../data/authValidation';

/**
 * `POST /api/auth/login` (format sesi platform: `accessToken` + `expiresIn`).
 * Endpoint ini anonim; token belum ada sebelum login berhasil.
 *
 * `post<LoginSession>()` mengembalikan `Promise<LoginSession>` sehingga bentuk
 * respons dicek dua kali: oleh tipe saat menulis kode, dan oleh
 * `isLoginSession()` saat runtime (upstream bisa mengirim bentuk lain).
 */
export async function loginAdmin(
  credentials: LoginCredentials,
): Promise<LoginSession> {
  const payload = await post<unknown>('/auth/login', credentials, {
    anonymous: true,
  });
  if (!isLoginSession(payload))
    throw new ApiError('Respons masuk tidak valid.', 502);
  return payload;
}
