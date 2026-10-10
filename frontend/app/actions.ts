'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, request, list, detail } from '@/lib/api';
import { resources, isResource } from '@/lib/resources';
import type { FormState, Resource, RecordData, Staff, Order } from '@/types';
export async function loginAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const username = String(form.get('username') ?? '').trim(),
    password = String(form.get('password') ?? '');
  const errors: Record<string, string> = {};
  if (!username) errors.username = 'Isi username.';
  if (!password) errors.password = 'Isi kata sandi.';
  if (Object.keys(errors).length) return { errors, values: { username } };
  let data: { accessToken: string; expiresIn: number };
  try {
    data = await request(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
          remember: form.get('remember') === 'on',
        }),
      },
      true,
    );
    if (
      !data.accessToken ||
      !Number.isFinite(data.expiresIn) ||
      data.expiresIn <= 0
    )
      throw new ApiError('Respons masuk tidak valid.', 502);
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return {
      message: error.message,
      errors: error.errors,
      values: { username },
    };
  }
  (await cookies()).set('cleango-session', data.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(form.get('remember') === 'on'
      ? { maxAge: Math.min(data.expiresIn, 604800) }
      : {}),
  });
  redirect('/');
}
export async function logoutAction() {
  (await cookies()).delete('cleango-session');
  redirect('/login');
}
export async function saveAction(
  resource: Resource,
  id: string | null,
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  if (!isResource(resource)) return { message: 'Jenis data tidak valid.' };
  const config = resources[resource],
    data: Record<string, unknown> = {},
    values: Record<string, string | string[]> = {},
    errors: Record<string, string> = {};
  for (const field of config.fields) {
    const raw =
      field.kind === 'multiselect'
        ? form.getAll(field.name).map(String)
        : String(form.get(field.name) ?? '').trim();
    values[field.name] = raw;
    if (field.required && !raw.length)
      errors[field.name] = 'Kolom ini wajib diisi.';
    if (typeof raw === 'string' && raw.length > 3000)
      errors[field.name] = 'Maksimal 3000 karakter.';
    if (field.kind === 'number') {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0)
        errors[field.name] = 'Isi angka nol atau lebih.';
      data[field.name] = n;
    } else if (field.kind === 'boolean') {
      if (raw !== 'true' && raw !== 'false')
        errors[field.name] = 'Pilih status yang valid.';
      data[field.name] = raw === 'true';
    } else if (field.name === 'features')
      data[field.name] = String(raw)
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    else data[field.name] = raw;
    if (
      field.options?.length &&
      field.kind === 'select' &&
      !field.options.includes(String(raw))
    )
      errors[field.name] = 'Pilihan tidak valid.';
    if (
      field.kind === 'email' &&
      raw &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(raw))
    )
      errors[field.name] = 'Format email belum sesuai.';
    if (
      field.name === 'time' &&
      raw &&
      !/^([01]?\d|2[0-3])[:.]([0-5]\d)(?:[–-]([01]?\d|2[0-3])[:.]([0-5]\d))?(?: WIB)?$/.test(
        String(raw),
      )
    )
      errors[field.name] =
        'Gunakan jam seperti 13.30 WIB atau 11.00–14.00 WIB.';
    if (field.kind === 'date' && raw) {
      const text = String(raw);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(text) ||
        !Number.isFinite(Date.parse(text)) ||
        new Date(text).toISOString().slice(0, 10) !== text
      )
        errors[field.name] = 'Tanggal tidak valid.';
    }
  }
  if (
    resource === 'orders' &&
    ['Sedang Dikerjakan', 'Selesai'].includes(String(data.status)) &&
    !(data.staff as string[]).length
  )
    errors.staff = 'Pilih petugas untuk status ini.';
  if (Object.keys(errors).length) return { errors, values };
  let saved: RecordData;
  try {
    const result = await request<{ data: RecordData }>(
      '/' + resource + (id ? '/' + encodeURIComponent(id) : ''),
      { method: id ? 'PATCH' : 'POST', body: JSON.stringify(data) },
    );
    saved = result.data;
    if (!saved || typeof saved.id !== 'string')
      throw new ApiError('Respons penyimpanan tidak valid.', 502);
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return { message: error.message, errors: error.errors, values };
  }
  revalidatePath(config.path);
  revalidatePath('/');
  revalidatePath('/laporan');
  revalidatePath(config.path + '/' + saved.id);
  redirect(
    id
      ? config.path + '?saved=1'
      : config.path + '/' + encodeURIComponent(saved.id) + '?saved=1',
  );
}
export async function deleteAction(
  resource: Resource,
  id: string,
  _previous: FormState,
  _form: FormData,
): Promise<FormState> {
  if (!isResource(resource)) return { message: 'Jenis data tidak valid.' };
  try {
    await request('/' + resource + '/' + encodeURIComponent(id), {
      method: 'DELETE',
    });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return { message: error.message };
  }
  revalidatePath(resources[resource].path);
  redirect(resources[resource].path + '?deleted=1');
}

export async function assignAction(
  id: string,
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const selected = [...new Set(form.getAll('staff').map(String))];
  if (!selected.length)
    return {
      errors: { staff: 'Pilih minimal satu petugas.' },
      values: { staff: selected },
    };
  try {
    const [staff, order] = await Promise.all([
      list<Staff>('staff'),
      detail<Order>('orders', id),
    ]);
    if (!['Menunggu Assign', 'Menunggu Lokasi'].includes(order.status))
      return { message: 'Status pesanan sudah berubah. Muat ulang daftar.' };
    if (
      selected.some(
        (name) =>
          !staff.some(
            (person) => person.name === name && person.status === 'Tersedia',
          ),
      )
    )
      return {
        errors: { staff: 'Pilih petugas yang tersedia.' },
        values: { staff: selected },
      };
    await request('/orders/' + encodeURIComponent(id), {
      method: 'PATCH',
      body: JSON.stringify({ staff: selected, status: 'Sedang Dikerjakan' }),
    });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return {
      message: error.message,
      errors: error.errors,
      values: { staff: selected },
    };
  }
  revalidatePath('/');
  revalidatePath('/pesanan');
  revalidatePath('/petugas');
  revalidatePath('/jadwal');
  revalidatePath('/pesanan/' + id);
  redirect('/pesanan?saved=1');
}
