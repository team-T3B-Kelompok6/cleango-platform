'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ApiError } from '@/lib/api';

async function adminFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = (await cookies()).get('cleango-session')?.value;
  if (!token) redirect('/login');
  const base = process.env.API_URL;
  if (!base) throw new ApiError('Layanan data belum dikonfigurasi.', 503);
  return fetch(base.replace(/\/$/, '') + path, {
    ...options,
    cache: 'no-store',
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      Authorization: 'Bearer ' + token,
      ...options.headers,
    },
  });
}

export async function getAdminNotificationsRead(): Promise<string[]> {
  const response = await adminFetch('/admin/notifications/read');
  if (!response.ok) {
    let message = 'Gagal memuat status dibaca.';
    try {
      const payload = await response.json();
      if (typeof payload?.message === 'string') message = payload.message;
    } catch {}
    throw new ApiError(message, response.status);
  }
  const payload = await response.json();
  const rawValue =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>).bookingIds
      : undefined;
  const rawIds = Array.isArray(rawValue) ? rawValue : [];
  const ids = rawIds.filter(
    (id): id is string | number =>
      (typeof id === 'string' && id.length > 0) ||
      (typeof id === 'number' && Number.isFinite(id) && id > 0),
  );
  return ids.map((id) => String(id));
}

export async function markAdminNotificationsRead(bookingIds: string[]): Promise<{ success: boolean; marked: number }> {
  const response = await adminFetch('/admin/notifications/read', {
    method: 'POST',
    body: JSON.stringify({ bookingIds: bookingIds.map((id) => Number(id)) }),
  });
  if (!response.ok) {
    let message = 'Gagal menyimpan status dibaca. Silakan coba lagi.';
    try {
      const payload = await response.json();
      if (typeof payload?.message === 'string') message = payload.message;
    } catch {}
    throw new ApiError(message, response.status);
  }
  const payload = await response.json();
  return { success: true, marked: Number(payload?.marked ?? 0) };
}