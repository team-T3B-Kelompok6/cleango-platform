import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { Resource, RecordData } from '@/types';
import {
  demoEnabled,
  demoMutation,
  demoRecords,
  isDemoId,
} from '../cleaner/demo-store';
import { TaskError } from '../cleaner/errors';
import { adminDemoEnabled } from '../demo/mode';
import { adminDemoRequest } from '../demo/admin-api';
import { ApiError } from './apiError';
import { upstreamRequest } from './serverApi';

/**
 * Pembungkus resource generik: mode demo, mutasi demo, dan penggabungan data.
 * Semua request non-demo tetap lewat `upstreamRequest`.
 */
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

/** Daftar resource dengan validasi bentuk `{ data: T[] }`. */
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

/** Detail resource; 404 langsung menjadi halaman `not-found` Next. */
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
