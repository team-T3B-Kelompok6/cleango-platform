import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import type { Resource, RecordData } from '@/types';
import {
  demoEnabled,
  demoMutation,
  demoRecords,
  isDemoId,
} from './cleaner/demo-store';
import { TaskError } from './cleaner/errors';
import { adminDemoEnabled } from './demo/mode';
import { adminDemoRequest } from './demo/admin-api';
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string>,
  ) {
    super(message);
  }
}
async function upstreamRequest<T>(
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
        ...(options.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
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
    const p = payload as Record<string, unknown>;
    const errors =
      p.errors && typeof p.errors === 'object' && !Array.isArray(p.errors)
        ? Object.fromEntries(
            Object.entries(p.errors).filter(
              ([, message]) => typeof message === 'string',
            ),
          )
        : undefined;
    throw new ApiError(
      typeof p.message === 'string' && p.message
        ? p.message
        : 'Permintaan gagal diproses.',
      response.status,
      errors,
    );
  }
  return payload as T;
}
export async function request<T>(
  path: string,
  options: RequestInit = {},
  anonymous = false,
): Promise<T> {
  if (adminDemoEnabled()) {
    try {
      return (await adminDemoRequest(
        path,
        options,
        (await cookies()).get('cleango-session')?.value ?? '',
      )) as T;
    } catch (error) {
      if (error instanceof TaskError) {
        if (error.status === 401 && !anonymous) redirect('/login?expired=1');
        throw new ApiError(error.message, error.status);
      }
      throw error;
    }
  }
  const match = /^\/(orders|staff|customers)(?:\/([^/?]+))?$/.exec(path);
  if (
    demoEnabled() &&
    !anonymous &&
    match?.[2] &&
    isDemoId(decodeURIComponent(match[2]))
  ) {
    // The upstream verifies the admin session even when only demo data is modified.
    await upstreamRequest('/staff');
    try {
      return (await demoMutation(
        match[1] as Resource,
        decodeURIComponent(match[2]),
        options.method ?? 'GET',
        typeof options.body === 'string' ? JSON.parse(options.body) : undefined,
      )) as T;
    } catch (error) {
      if (error instanceof TaskError)
        throw new ApiError(error.message, error.status);
      throw error;
    }
  }
  const payload = await upstreamRequest<T>(path, options, anonymous);
  if (
    demoEnabled() &&
    !anonymous &&
    match &&
    !match[2] &&
    (!options.method || options.method === 'GET')
  ) {
    const envelope = payload as { data: RecordData[] };
    if (Array.isArray(envelope.data))
      return {
        ...envelope,
        data: [...envelope.data, ...(await demoRecords(match[1] as Resource))],
      } as T;
  }
  return payload;
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
