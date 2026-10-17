import 'server-only';
import { cache } from 'react';
import { ApiError, request } from './api';
import { isPromo } from './promo-rules';
import type { Promo } from '@/types/promos';

export const listPromos = cache(async (): Promise<Promo[]> => {
  const payload = await request<{ data?: unknown } | null>('/promos');
  if (!Array.isArray(payload?.data) || !payload.data.every(isPromo))
    throw new ApiError('Format data promo belum sesuai.', 502);
  return payload.data as Promo[];
});

export async function readPromo(id: string) {
  const payload = await request<{ data?: unknown } | null>(
    '/promos/' + encodeURIComponent(id),
  );
  if (!isPromo(payload?.data) || payload.data.id !== id)
    throw new ApiError('Format detail promo belum sesuai.', 502);
  return payload.data;
}

export async function promoListState() {
  try {
    return { promos: await listPromos(), message: '' };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return {
      promos: [] as Promo[],
      message:
        error.status === 404
          ? 'Pengelolaan promo belum tersedia.'
          : error.message,
    };
  }
}
