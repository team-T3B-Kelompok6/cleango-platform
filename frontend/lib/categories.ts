import 'server-only';
import { cache } from 'react';
import { ApiError, request } from './api';
import type { Category } from '@/types';

export type CategoryResource = Category['resource'];
export const listCategories = cache(async (resource: CategoryResource) => {
  let result: { data: Category[] };
  try {
    result = await request<{ data: Category[] }>(
      '/categories?resource=' + resource,
    );
  } catch (error) {
    // Older API versions keep category names on the service or FAQ records.
    if (error instanceof ApiError && error.status === 404) return [];
    throw error;
  }
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
