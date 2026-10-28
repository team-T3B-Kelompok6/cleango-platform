import 'server-only';
import { cache } from 'react';
import { ApiError, request } from './api';
import { adminDemoEnabled } from './demo/mode';
import type { Category } from '@/types';

export type CategoryResource = Category['resource'];
function categoryPath(resource: CategoryResource) {
  return resource === 'services' && !adminDemoEnabled()
    ? '/admin/categories'
    : '/categories';
}

function categoryRecord(value: unknown, resource: CategoryResource): Category {
  if (!value || typeof value !== 'object')
    throw new ApiError('Format kategori tidak sesuai.', 502);
  const item = value as Record<string, unknown>;
  const native = categoryPath(resource) === '/admin/categories';
  if (
    !(typeof item.id === 'string' && item.id) &&
    !(
      native &&
      typeof item.id === 'number' &&
      Number.isSafeInteger(item.id) &&
      item.id > 0
    )
  )
    throw new ApiError('Format kategori tidak sesuai.', 502);
  if (
    typeof item.name !== 'string' ||
    !item.name.trim() ||
    (!native && item.resource !== resource)
  )
    throw new ApiError('Format kategori tidak sesuai.', 502);
  return {
    id: String(item.id),
    name: native && item.name === 'Sofa dan Kasur' ? 'Sofa' : item.name,
    resource,
    icon: typeof item.icon === 'string' ? item.icon : null,
  };
}

export async function createCategoryRecord(
  resource: CategoryResource,
  name: string,
) {
  const result = await request<{ data: unknown }>(categoryPath(resource), {
    method: 'POST',
    body: JSON.stringify({
      name:
        categoryPath(resource) === '/admin/categories' && name === 'Sofa'
          ? 'Sofa dan Kasur'
          : name,
      resource,
    }),
  });
  return categoryRecord(result.data, resource);
}

export async function deleteCategoryRecord(
  resource: CategoryResource,
  id: string,
  deleteServices = false,
) {
  await request(
    categoryPath(resource) +
      '/' +
      encodeURIComponent(id) +
      (deleteServices ? '?deleteServices=true' : ''),
    { method: 'DELETE' },
  );
}

export const listCategories = cache(async (resource: CategoryResource) => {
  let result: { data: unknown[] };
  try {
    result = await request<{ data: unknown[] }>(
      categoryPath(resource) + '?resource=' + resource,
    );
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 404 &&
      resource === 'faqs'
    )
      return [];
    throw error;
  }
  if (!Array.isArray(result.data)) {
    throw new ApiError('Format kategori tidak sesuai.', 502);
  }
  return result.data.map((item) => categoryRecord(item, resource));
});
