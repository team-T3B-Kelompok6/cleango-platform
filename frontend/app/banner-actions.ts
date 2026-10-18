'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, request } from '@/lib/api';
import { uploadBanner, validImageUrl } from '@/lib/banners';
import type { Banner, FormState } from '@/types';

export async function saveBanner(
  id: string | null,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const file = form.get('bannerImage');
  const hasFile = file instanceof File && file.size > 0;
  if (!id && !hasFile)
    return { errors: { bannerImage: 'Pilih gambar banner promo.' } };
  if (
    hasFile &&
    (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 2 * 1024 * 1024)
  )
    return {
      errors: { bannerImage: 'Gunakan JPG, PNG, atau WebP, maksimal 2 MB.' },
    };
  try {
    const imageUrl = hasFile
      ? await uploadBanner(file)
      : (await request<{ data: Banner }>('/banners/' + encodeURIComponent(id!)))
          .data?.imageUrl;
    if (!validImageUrl(imageUrl))
      throw new ApiError(
        'Gambar banner tidak tersedia. Pilih gambar baru.',
        502,
      );
    const saved = await request<{ data: Banner }>(
      '/banners' + (id ? '/' + encodeURIComponent(id) : ''),
      { method: id ? 'PATCH' : 'POST', body: JSON.stringify({ imageUrl }) },
    );
    if (
      !saved.data ||
      typeof saved.data.id !== 'string' ||
      !saved.data.id ||
      (id && saved.data.id !== id) ||
      !validImageUrl(saved.data.imageUrl) ||
      saved.data.imageUrl !== imageUrl
    )
      throw new ApiError('Respons penyimpanan banner tidak valid.', 502);
  } catch (error) {
    if (error instanceof ApiError)
      return { message: error.message, errors: error.errors };
    throw error;
  }
  revalidatePath('/layanan');
  redirect('/layanan?bannerSaved=1');
}
export async function deleteBanner(
  id: string,
  _state: FormState,
  _form: FormData,
): Promise<FormState> {
  try {
    await request('/banners/' + encodeURIComponent(id), { method: 'DELETE' });
  } catch (error) {
    if (error instanceof ApiError) return { message: error.message };
    throw error;
  }
  revalidatePath('/layanan');
  redirect('/layanan');
}
