'use server';
import { revalidatePath } from 'next/cache';
import { ApiError, list } from '@/lib/api';
import {
  createCategoryRecord,
  deleteCategoryRecord,
  listCategories,
  updateCategoryRecord,
  type CategoryResource,
} from '@/lib/categories';
import { resources } from '@/lib/resources';
import { uploadImage } from '@/lib/service-image';
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
  if (
    resource === 'services' &&
    name.toLocaleLowerCase('id') === 'sofa dan kasur'
  )
    name = 'Sofa';
  const values = { name };
  const iconFile = form.get('categoryIcon');
  const hasIcon = resource === 'services' && iconFile instanceof File;
  if (
    hasIcon &&
    (!iconFile.size ||
      iconFile.size > 2 * 1024 * 1024 ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(iconFile.type))
  )
    return {
      errors: { categoryIcon: 'Gunakan JPG, PNG, atau WebP, maksimal 2 MB.' },
      values,
    };
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
    const icon = hasIcon
      ? await uploadImage(iconFile, 'category-icon')
      : undefined;
    const category = await createCategoryRecord(resource, name, icon);
    revalidatePath(resources[resource].path);
    if (category.name !== name)
      throw new ApiError(
        'Kategori belum tersimpan dengan benar. Muat ulang daftar kategori.',
        502,
      );
    if (icon !== undefined && category.icon !== icon)
      return {
        message:
          'Kategori sudah dibuat, tetapi ikon belum tersimpan. Periksa dukungan ikon pada API kategori.',
        errors: { categoryIcon: 'Ikon kategori belum tersimpan.' },
        values,
      };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return {
      message: error.message,
      errors: error.errors?.icon
        ? { ...error.errors, categoryIcon: error.errors.icon }
        : error.errors,
      values,
    };
  }
  revalidatePath(resources[resource].path);
  return { success: true };
}

export async function updateCategory(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const id = String(form.get('categoryId') ?? '').trim();
  let name = String(form.get('name') ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  if (name.toLocaleLowerCase('id') === 'sofa dan kasur') name = 'Sofa';
  const values = { categoryId: id, name, previousName: '' };
  if (!id) return { message: 'Pilih kategori yang ingin diubah.', values };
  if (!name || name.length > 60)
    return {
      errors: { name: 'Isi nama kategori, maksimal 60 karakter.' },
      values,
    };
  const file = form.get('categoryIcon');
  const hasIcon = file instanceof File;
  if (
    hasIcon &&
    (!file.size ||
      file.size > 2 * 1024 * 1024 ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
  )
    return {
      errors: { categoryIcon: 'Gunakan JPG, PNG, atau WebP, maksimal 2 MB.' },
      values,
    };
  try {
    const categories = await listCategories('services');
    const current = categories.find((category) => category.id === id);
    if (!current)
      return {
        message: 'Kategori tidak ditemukan. Muat ulang halaman.',
        values,
      };
    values.previousName = current.name;
    if (
      categories.some(
        (category) =>
          category.id !== id &&
          category.name.toLocaleLowerCase('id') ===
            name.toLocaleLowerCase('id'),
      )
    )
      return { errors: { name: 'Kategori ini sudah ada.' }, values };
    const icon = hasIcon
      ? await uploadImage(file, 'category-icon')
      : form.get('removeCategoryIcon') === 'true'
        ? null
        : undefined;
    const expectedIcon = icon === undefined ? (current.icon ?? null) : icon;
    if (name === current.name && expectedIcon === (current.icon ?? null))
      return { success: true, values };
    const saved = await updateCategoryRecord(id, name, icon);
    revalidatePath(resources.services.path);
    if (saved.name !== name)
      return {
        message: 'Nama kategori belum tersimpan dengan benar.',
        errors: { name: 'Perubahan nama kategori belum tersimpan.' },
        values,
      };
    if ((saved.icon ?? null) !== expectedIcon)
      return {
        message: 'Perubahan kategori belum lengkap. Periksa ikonnya.',
        errors: { categoryIcon: 'Ikon kategori belum tersimpan dengan benar.' },
        values,
      };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return {
      message: error.message,
      errors: error.errors?.icon
        ? { ...error.errors, categoryIcon: error.errors.icon }
        : error.errors,
      values,
    };
  }
  return { success: true, values };
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
