'use server';
import { revalidatePath } from 'next/cache';
import { ApiError, list } from '@/lib/api';
import {
  createCategoryRecord,
  deleteCategoryRecord,
  listCategories,
  type CategoryResource,
} from '@/lib/categories';
import { resources } from '@/lib/resources';
import type { FormState } from '@/types';

export async function addCategory(
  resource: CategoryResource,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  if (!['services', 'faqs'].includes(resource))
    return { message: 'Jenis kategori tidak valid.' };
  let name = String(form.get('name') ?? '')
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
    const category = await createCategoryRecord(resource, name);
    revalidatePath(resources[resource].path);
    if (category.name !== name)
      throw new ApiError(
        'Kategori belum tersimpan dengan benar. Muat ulang daftar kategori.',
        502,
      );
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return { message: error.message, errors: error.errors, values };
  }
  revalidatePath(resources[resource].path);
  return { success: true };
}

export async function removeCategory(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const id = String(form.get('categoryId') ?? '').trim();
  if (!id) return { message: 'Pilih kategori yang ingin dihapus.' };
  const deleteServices = form.get('deleteServices') === 'on';
  let name = '';
  try {
    const categories = await listCategories('services');
    const category = categories.find((item) => item.id === id);
    if (!category)
      return { message: 'Kategori tidak ditemukan. Muat ulang halaman.' };
    const services = await list('services');
    if (
      !deleteServices &&
      services.some((item) => item.category === category.name)
    )
      return {
        message:
          'Kategori masih digunakan. Centang hapus semua layanan atau pindahkan layanan ke kategori lain terlebih dahulu.',
      };
    await deleteCategoryRecord('services', id, deleteServices);
    name = category.name;
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return { message: error.message };
  }
  revalidatePath(resources.services.path);
  return { success: true, values: { name } };
}
