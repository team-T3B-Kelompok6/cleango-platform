'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, request, list, detail } from '@/lib/api';
import { resources, isResource } from '@/lib/resources';
import { listCategories } from '@/lib/categories';
import { uploadServiceImage, uploadImage } from '@/lib/service-image';
import { unsavedFields } from '@/lib/saved-fields';
import { needsAssignment } from '@/lib/order-flow';
import { withOrderWorkTimes } from '@/lib/order-work-times';
import { dispatchAssignment } from '@/lib/cleaner/service';
import { isDemoId } from '@/lib/cleaner/demo-store';
import { serviceSkillOptions } from '@/lib/staff-skills';
import {
  assignmentIssue,
  linkedOrders,
  scheduleIssue,
} from '@/lib/staff-schedules';
import type {
  FormState,
  Resource,
  RecordData,
  Staff,
  Order,
  Schedule,
  Service,
} from '@/types';
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
      typeof data.accessToken !== 'string' ||
      !data.accessToken.trim() ||
      /[\s\u0000-\u001f\u007f;]/.test(data.accessToken) ||
      !Number.isSafeInteger(data.expiresIn) ||
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
  if (!id && !config.canCreate)
    return { message: 'Data ini dibuat melalui aplikasi pelanggan.' };
  if (id !== null && (typeof id !== 'string' || !id.trim()))
    return { message: 'ID data tidak valid.' };
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
    if (field.name === 'discountPrice' && raw === '') {
      data[field.name] = null;
    } else if (field.kind === 'number') {
      const n = Number(raw);
      if (!Number.isSafeInteger(n) || n < 0)
        errors[field.name] = 'Isi rupiah bulat, nol atau lebih.';
      data[field.name] = n;
    } else if (field.kind === 'boolean') {
      if (raw !== 'true' && raw !== 'false')
        errors[field.name] = 'Pilih status yang valid.';
      data[field.name] = raw === 'true';
    } else if (field.lines)
      data[field.name] = String(raw)
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    else data[field.name] = raw;
    if (
      field.options?.length &&
      field.kind === 'select' &&
      !(
        field.name === 'category' &&
        (resource === 'services' || resource === 'faqs')
      ) &&
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
    [
      'Menunggu Lokasi',
      'Menuju Lokasi',
      'Sedang Dikerjakan',
      'Selesai',
    ].includes(String(data.status)) &&
    !(data.staff as string[]).length
  )
    errors.staff = 'Pilih petugas untuk status ini.';
  const imageFile = form.get('serviceImage');
  const hasImage = imageFile instanceof File && imageFile.size > 0;
  const staffPhoto = form.get('staffPhoto');
  const hasStaffPhoto = staffPhoto instanceof File && staffPhoto.size > 0;
  if (resource === 'staff') {
    if (
      hasStaffPhoto &&
      (!['image/jpeg', 'image/png', 'image/webp'].includes(staffPhoto.type) ||
        staffPhoto.size > 2 * 1024 * 1024)
    )
      errors.staffPhoto = 'Gunakan JPG, PNG, atau WebP, maksimal 2 MB.';
    if (form.get('removeStaffPhoto') === 'true') data.photoUrl = null;
  }
  if (resource === 'services') {
    // Discounts are managed exclusively through promo codes.
    data.discountPrice = null;
    const features = data.features as string[];
    if (
      features.length > 15 ||
      features.some((feature) => feature.length > 180)
    )
      errors.features = 'Maksimal 15 fasilitas, masing-masing 180 karakter.';
    if (
      data.discountPrice != null &&
      (!Number.isSafeInteger(data.discountPrice) ||
        Number(data.discountPrice) <= 0 ||
        Number(data.discountPrice) >= Number(data.price))
    )
      errors.discountPrice =
        'Harga promo harus lebih dari Rp0 dan lebih rendah dari harga dasar.';
    if (!Number.isSafeInteger(data.price) || Number(data.price) <= 0)
      errors.price = 'Isi harga dasar lebih dari Rp0 dalam rupiah bulat.';
    if (
      hasImage &&
      (!['image/jpeg', 'image/png'].includes(imageFile.type) ||
        imageFile.size > 5 * 1024 * 1024)
    )
      errors.serviceImage = 'Gunakan JPG atau PNG, maksimal 5 MB.';
    if (form.get('removeImage') === 'true') data.imageUrl = null;
  }
  if (Object.keys(errors).length) return { errors, values };
  let saved: RecordData;
  try {
    if (resource === 'staff') {
      const available = serviceSkillOptions(await list<Service>('services'));
      const skills = [...new Set(data.skills as string[])];
      if (skills.some((skill) => !available.includes(skill)))
        return {
          errors: {
            skills:
              'Daftar layanan sudah berubah. Pilih kembali keahlian petugas.',
          },
          values,
        };
      data.skills = skills;
    }
    if (resource === 'orders') {
      const [staff, current, schedules, orders] = await Promise.all([
        list<Staff>('staff'),
        detail<Order>('orders', id!),
        list<Schedule>('schedules'),
        list<Order>('orders'),
      ]);
      const selected = [...new Set(data.staff as string[])];
      const liveOrders = await withOrderWorkTimes(orders);
      if (
        selected.some((name) => {
          const person = staff.find((item) => item.name === name);
          return !person || isDemoId(person.id) !== isDemoId(id!);
        })
      )
        return {
          errors: {
            staff:
              'Petugas tidak tersedia untuk pesanan ini. Perbarui pilihan petugas.',
          },
          values,
        };
      if (
        selected.some(
          (name) =>
            !(Array.isArray(current.staff) && current.staff.includes(name)) &&
            !staff.some(
              (person) =>
                person.name === name &&
                ['Tersedia', 'Bertugas'].includes(person.status),
            ),
        )
      )
        return {
          errors: {
            staff:
              'Ada petugas yang tidak lagi dapat ditugaskan. Perbarui pilihan.',
          },
          values,
        };
      if (data.status === 'Menunggu Assign' && selected.length)
        return {
          errors: {
            status:
              'Pilih Siap Berangkat jika petugas sudah ditentukan, atau kosongkan pilihan petugas.',
          },
          values,
        };
      data.staff = selected;
      if (
        ['Menunggu Lokasi', 'Menuju Lokasi', 'Sedang Dikerjakan'].includes(
          String(data.status),
        )
      ) {
        for (const name of selected) {
          const issue = assignmentIssue(
            staff.find((person) => person.name === name)!,
            { ...current, ...data } as Order,
            schedules,
            liveOrders,
          );
          if (issue) return { errors: { staff: name + ': ' + issue }, values };
        }
      }
    }
    if (resource === 'schedules') {
      const [staff, schedules, orders] = await Promise.all([
        list<Staff>('staff'),
        list<Schedule>('schedules'),
        list<Order>('orders'),
      ]);
      const previous = id
        ? schedules.find((shift) => shift.id === id)
        : undefined;
      if (
        !staff.some(
          (person) =>
            person.name === data.staff &&
            (previous?.staff === person.name ||
              ['Tersedia', 'Bertugas'].includes(person.status)),
        )
      )
        return {
          errors: { staff: 'Pilih petugas aktif yang terdaftar.' },
          values,
        };
      const issue = scheduleIssue(
        { ...data, id: id ?? '' } as Schedule,
        schedules,
        orders,
        previous,
      );
      if (issue) return { message: issue, values };
    }
    if (resource === 'services' || resource === 'faqs') {
      const categories = await listCategories(resource);
      const existing = id ? await detail(resource, id) : undefined;
      const fallbackRecords = categories.length ? [] : await list(resource);
      if (
        !categories.some((category) => category.name === data.category) &&
        !fallbackRecords.some((record) => record.category === data.category) &&
        existing?.category !== data.category
      )
        return {
          errors: { category: 'Pilih kategori yang tersedia.' },
          values,
        };
    }
    if (resource === 'services' && hasImage)
      data.imageUrl = await uploadServiceImage(imageFile);
    if (resource === 'staff' && hasStaffPhoto)
      data.photoUrl = await uploadImage(staffPhoto, 'staff-photo');
    const result = await request<{ data: RecordData }>(
      '/' + resource + (id ? '/' + encodeURIComponent(id) : ''),
      { method: id ? 'PATCH' : 'POST', body: JSON.stringify(data) },
    );
    saved = result.data;
    if (
      !saved ||
      typeof saved.id !== 'string' ||
      !saved.id ||
      (id && saved.id !== id)
    )
      throw new ApiError('Respons penyimpanan tidak valid.', 502);
    const incomplete = unsavedFields(resource, data, saved);
    if (Object.keys(incomplete).length) {
      revalidatePath(config.path);
      revalidatePath(config.path + '/' + saved.id);
      revalidatePath('/');
      return {
        message:
          'Penyimpanan belum lengkap. Periksa pesan di bawah kolom terkait sebelum melanjutkan.',
        errors: incomplete,
        values,
      };
    }
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return { message: error.message, errors: error.errors, values };
  }
  let taskDispatch = 'none';
  if (
    resource === 'orders' &&
    Array.isArray(saved.staff) &&
    saved.staff.length &&
    ['Menunggu Lokasi', 'Menuju Lokasi', 'Sedang Dikerjakan'].includes(
      String(saved.status),
    )
  )
    taskDispatch = await dispatchAssignment(saved as Order);
  revalidatePath(config.path);
  revalidatePath('/');
  revalidatePath('/laporan');
  revalidatePath('/jadwal');
  revalidatePath('/pesanan');
  revalidatePath(config.path + '/' + saved.id);
  redirect(
    id
      ? config.path +
          '?saved=1' +
          (taskDispatch !== 'none' ? '&taskDispatch=' + taskDispatch : '')
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
    if (resource === 'schedules') {
      const [schedule, orders] = await Promise.all([
        detail<Schedule>('schedules', id),
        list<Order>('orders'),
      ]);
      if (
        linkedOrders(schedule, orders).some(
          (order) => order.status !== 'Selesai',
        )
      )
        return {
          message:
            'Shift masih dipakai pesanan aktif. Pindahkan penugasan pesanan terlebih dahulu.',
        };
    }
    await request('/' + resource + '/' + encodeURIComponent(id), {
      method: 'DELETE',
    });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return { message: error.message };
  }
  revalidatePath(resources[resource].path);
  revalidatePath('/');
  revalidatePath('/laporan');
  revalidatePath('/jadwal');
  revalidatePath('/pesanan');
  revalidatePath('/customer');
  revalidatePath('/petugas');
  revalidatePath(resources[resource].path + '/' + encodeURIComponent(id));
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
    const [staff, order, schedules, orders] = await Promise.all([
      list<Staff>('staff'),
      detail<Order>('orders', id),
      list<Schedule>('schedules'),
      list<Order>('orders'),
    ]);
    if (
      selected.some((name) => {
        const person = staff.find((item) => item.name === name);
        return !person || isDemoId(person.id) !== isDemoId(id);
      })
    )
      return {
        errors: {
          staff:
            'Petugas tidak tersedia untuk pesanan ini. Perbarui pilihan petugas.',
        },
        values: { staff: selected },
      };
    if (!['Menunggu Assign', 'Menunggu Lokasi'].includes(order.status))
      return { message: 'Status pesanan sudah berubah. Muat ulang daftar.' };
    if (!needsAssignment(order))
      return {
        message:
          'Pesanan sudah memiliki petugas. Ubah penugasan melalui detail pesanan.',
      };
    const liveOrders = await withOrderWorkTimes(orders);
    if (
      selected.some(
        (name) =>
          !staff.some(
            (person) =>
              person.name === name &&
              !assignmentIssue(person, order, schedules, liveOrders),
          ),
      )
    )
      return {
        errors: {
          staff:
            'Jadwal petugas tidak sesuai atau sudah terisi. Perbarui pilihan dan periksa Kelola Jadwal.',
        },
        values: { staff: selected },
      };
    const result = await request<{ data: RecordData }>(
      '/orders/' + encodeURIComponent(id),
      {
        method: 'PATCH',
        body: JSON.stringify({ staff: selected, status: 'Menunggu Lokasi' }),
      },
    );
    revalidatePath('/pesanan');
    if (
      !result.data ||
      result.data.id !== id ||
      result.data.status !== 'Menunggu Lokasi' ||
      !Array.isArray(result.data.staff) ||
      JSON.stringify([...result.data.staff].sort()) !==
        JSON.stringify([...selected].sort())
    )
      throw new ApiError(
        'Penugasan belum tersimpan dengan benar. Periksa pesanan sebelum mencoba lagi.',
        502,
      );
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
  const assigned = await detail<Order>('orders', id);
  const taskDispatch = await dispatchAssignment({
    ...assigned,
    staff: selected,
    status: 'Menunggu Lokasi',
  });
  redirect('/pesanan?saved=1&taskDispatch=' + taskDispatch);
}
