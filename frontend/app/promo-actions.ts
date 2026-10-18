'use server';
import { revalidatePath } from 'next/cache';
import { ApiError, request, list } from '@/lib/api';
import { listPromos, readPromo } from '@/lib/promos';
import { parsePromo, isPromo } from '@/lib/promo-rules';
import type { PromoActionState, PromoInput } from '@/types/promos';
import type { Service } from '@/types';

function changedFields(input: PromoInput, saved: PromoInput) {
  const fields: (keyof PromoInput)[] = [
    'name',
    'code',
    'discountType',
    'discountValue',
    'maxDiscount',
    'minPurchase',
    'scope',
    'serviceIds',
    'startsOn',
    'endsOn',
    'usageLimit',
    'perCustomerLimit',
    'stackable',
    'active',
  ];
  return fields.filter((field) => {
    return field === 'serviceIds'
      ? JSON.stringify([...input.serviceIds].sort()) !==
          JSON.stringify([...saved.serviceIds].sort())
      : input[field] !== saved[field];
  });
}

export async function savePromo(
  id: string | null,
  _state: PromoActionState,
  form: FormData,
): Promise<PromoActionState> {
  const { data, errors, values } = parsePromo(form);
  if (Object.keys(errors).length) return { errors, values };
  try {
    const [promos, services] = await Promise.all([
      listPromos(),
      list<Service>('services'),
    ]);
    const existing = id ? promos.find((promo) => promo.id === id) : undefined;
    if (id && !existing)
      return { message: 'Promo tidak ditemukan. Muat ulang daftar.', values };
    if (promos.some((promo) => promo.id !== id && promo.code === data.code))
      return { errors: { code: 'Kode promo ini sudah digunakan.' }, values };
    if (
      data.scope === 'services' &&
      data.serviceIds.some(
        (id) => !services.some((service) => service.id === id),
      )
    )
      return {
        errors: {
          serviceIds: 'Ada layanan yang tidak lagi tersedia. Perbarui pilihan.',
        },
        values,
      };
    if (
      data.usageLimit !== null &&
      existing?.usedCount != null &&
      data.usageLimit < existing.usedCount
    )
      return {
        errors: {
          usageLimit:
            'Batas pemakaian tidak boleh lebih kecil dari jumlah yang sudah dipakai.',
        },
        values,
      };
    const payload = await request<{ data?: unknown } | null>(
      '/promos' + (id ? '/' + encodeURIComponent(id) : ''),
      {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(data),
      },
    );
    revalidatePath('/layanan');
    if (!isPromo(payload?.data) || (id && payload.data.id !== id))
      throw new ApiError(
        'Respons penyimpanan promo belum sesuai. Periksa daftar sebelum mencoba lagi.',
        502,
      );
    const incomplete = changedFields(data, payload.data);
    if (incomplete.length)
      return {
        message:
          'Penyimpanan promo belum lengkap. Periksa isian yang belum tersimpan.',
        values,
        errors: Object.fromEntries(
          incomplete.map((key) => [key, 'Pengaturan ini belum tersimpan.']),
        ),
      };
    return { success: true, promo: payload.data };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return {
      message:
        error.status === 404
          ? 'Pengelolaan promo belum tersedia.'
          : error.message,
      errors: error.errors,
      values,
    };
  }
}

export async function setPromoActive(
  id: string,
  active: boolean,
): Promise<PromoActionState> {
  if (typeof active !== 'boolean')
    return { message: 'Status promo tidak valid.' };
  try {
    const existing = await readPromo(id);
    const result = await request<{ data?: unknown } | null>(
      '/promos/' + encodeURIComponent(id),
      { method: 'PATCH', body: JSON.stringify({ active }) },
    );
    revalidatePath('/layanan');
    if (
      !isPromo(result?.data) ||
      result.data.id !== id ||
      changedFields({ ...existing, active }, result.data).length
    )
      throw new ApiError(
        'Status promo belum tersimpan dengan benar. Muat ulang daftar.',
        502,
      );
    return { success: true, promo: result.data };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return { message: error.message };
  }
}

export async function removePromo(
  id: string,
  _state: PromoActionState,
  _form: FormData,
): Promise<PromoActionState> {
  try {
    await request('/promos/' + encodeURIComponent(id), { method: 'DELETE' });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return { message: error.message };
  }
  revalidatePath('/layanan');
  return { success: true };
}
