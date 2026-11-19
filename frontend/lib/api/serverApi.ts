import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ApiError } from './apiError';
import type { ApiErrorBody } from './apiTypes';

export const SESSION_COOKIE = 'cleango-session';

/**
 * Satu-satunya jalur server component/server action menuju Express.
 * Token dibaca dari cookie HTTP-only, bukan dari argumen pemanggil.
 */
export async function upstreamRequest<T>(
  path: string,
  options: RequestInit = {},
  anonymous = false,
): Promise<T> {
  const base = process.env.API_URL;
  if (!base) throw new ApiError('Layanan data belum dikonfigurasi.', 503);
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!anonymous && !token) redirect('/login');

  const target = base.replace(/\/$/, '') + path;
  let response: Response;
  try {
    response = await fetch(target, {
      ...options,
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    // Tanpa log ini, 503 terlihat seperti bug aplikasi padahal backend mati
    // atau API_URL menunjuk port yang salah. Pesan ke pengguna tetap ramah.
    const reason =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);
    console.error(`[api] gagal menghubungi ${target} (${reason})`);
    const timeout =
      error instanceof Error &&
      (error.name === 'TimeoutError' || error.name === 'AbortError');
    throw new ApiError(
      timeout
        ? 'Layanan data tidak merespons. Coba lagi sebentar.'
        : 'Layanan data belum dapat dihubungi. Silakan coba lagi.',
      503,
    );
  }

  if (response.status === 401 && !anonymous) redirect('/login?expired=1');

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('Respons layanan data tidak valid.', 502);
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    throw new ApiError('Respons layanan data tidak valid.', 502);

  if (!response.ok) {
    const body = payload as ApiErrorBody;
    const errors =
      body.errors &&
      typeof body.errors === 'object' &&
      !Array.isArray(body.errors)
        ? Object.fromEntries(
            Object.entries(body.errors).filter(
              ([, message]) => typeof message === 'string',
            ),
          )
        : undefined;
    throw new ApiError(
      typeof body.message === 'string' && body.message
        ? body.message
        : 'Permintaan gagal diproses.',
      response.status,
      errors,
      typeof body.code === 'string' ? body.code : undefined,
    );
  }

  return payload as T;
}
