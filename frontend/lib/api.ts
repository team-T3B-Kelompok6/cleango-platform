import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import type { Resource, RecordData } from '@/types';
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string>,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  options: RequestInit = {},
  anonymous = false,
): Promise<T> {
  const base = process.env.API_URL;
  if (!base) throw new ApiError('Layanan data belum dikonfigurasi.', 503);
  const token = (await cookies()).get('cleango-session')?.value;
  if (!anonymous && !token) redirect('/login');
  let response: Response;
  try {
    response = await fetch(base.replace(/\/$/, '') + path, {
      ...options,
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      'Layanan data belum dapat dihubungi. Silakan coba lagi.',
      503,
    );
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('Respons layanan data tidak valid.', 502);
  }
  if (!response.ok) {
    const p = (payload && typeof payload === 'object' ? payload : {}) as {
      message?: string;
      errors?: Record<string, string>;
    };
    if (response.status === 401 && !anonymous) redirect('/login?expired=1');
    throw new ApiError(
      p.message ?? 'Permintaan gagal diproses.',
      response.status,
      p.errors,
    );
  }
  return payload as T;
}
export const list = cache(async function list<
  T extends RecordData = RecordData,
>(resource: Resource): Promise<T[]> {
  const payload = await request<{ data: T[] }>('/' + resource);
  if (
    !Array.isArray(payload.data) ||
    payload.data.some((item) => !item || typeof item.id !== 'string')
  )
    throw new ApiError('Format daftar data tidak sesuai.', 502);
  return payload.data;
});
export const detail = cache(async function detail<
  T extends RecordData = RecordData,
>(resource: Resource, id: string): Promise<T> {
  try {
    const payload = await request<{ data: T }>(
      '/' + resource + '/' + encodeURIComponent(id),
    );
    if (!payload.data || payload.data.id !== id)
      throw new ApiError('Format detail data tidak sesuai.', 502);
    return payload.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
});
