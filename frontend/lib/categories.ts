import 'server-only';
import { cache } from 'react';
import { ApiError, request } from './api';
import type { Category } from '@/types';

export type CategoryResource = Category['resource'];
export const listCategories = cache(async (resource: CategoryResource) => {
  const result = await request<{ data: Category[] }>(
    '/categories?resource=' + resource,
  );
  if (
    !Array.isArray(result.data) ||
    result.data.some(
      (item) =>
        !item.id || typeof item.name !== 'string' || item.resource !== resource,
    )
  ) {
    throw new ApiError('Format kategori tidak sesuai.', 502);
  }
  return result.data;
});
