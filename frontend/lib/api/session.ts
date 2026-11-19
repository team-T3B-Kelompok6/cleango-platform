import 'server-only';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from './serverApi';

/** Batas maksimum cookie sesi saat "Ingat saya" dicentang (7 hari). */
const REMEMBER_MAX_AGE_SECONDS = 604800;

/** Token sesi admin yang tersimpan di cookie HTTP-only. */
export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Apakah permintaan saat ini membawa cookie sesi. */
export async function hasSession(): Promise<boolean> {
  return (await cookies()).has(SESSION_COOKIE);
}

/**
 * Simpan token hasil login. Token tidak pernah dikirim ke client sebagai
 * props maupun disimpan di store, supaya tidak bisa dibaca JavaScript.
 */
export async function saveSession(
  token: string,
  expiresIn: number,
  remember: boolean,
): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(remember
      ? { maxAge: Math.min(expiresIn, REMEMBER_MAX_AGE_SECONDS) }
      : {}),
  });
}

/** Hapus sesi; dipakai logout dan pemulihan sesi tidak valid. */
export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
