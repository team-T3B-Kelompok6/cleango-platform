'use server';
import { revalidatePath } from 'next/cache';
import { ApiError, request } from '@/lib/api';
import { listCategories, type CategoryResource } from '@/lib/categories';
import { resources } from '@/lib/resources';
import type { FormState } from '@/types';

export async function addCategory(
  resource: CategoryResource,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  if (!['services', 'faqs'].includes(resource))
    return { message: 'Jenis kategori tidak valid.' };
  const name = String(form.get('name') ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  const values = { name };
  if (!name || name.length > 60)
    return {
      errors: { name: 'Isi nama kategori, maksimal 60 karakter.' },
      values,
    };
  try {
    const categories = await listCategories(resource);
    if (
      categories.some(
        (item) =>
          item.name.toLocaleLowerCase('id') === name.toLocaleLowerCase('id'),
      )
    ) {
      return { errors: { name: 'Kategori ini sudah ada.' }, values };
    }
    await request('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, resource }),
    });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return { message: error.message, errors: error.errors, values };
  }
  revalidatePath(resources[resource].path);
  return { success: true };
}
