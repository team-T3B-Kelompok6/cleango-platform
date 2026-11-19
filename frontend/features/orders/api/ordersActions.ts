'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, detail, list, request } from '@/lib/api';
import { needsAssignment } from '@/lib/order-flow';
import { withOrderWorkTimes } from '@/lib/order-work-times';
import { dispatchAssignment } from '@/lib/cleaner/service';
import { isDemoId } from '@/lib/cleaner/demo-store';
import { assignmentIssue } from '@/lib/staff-schedules';
import type { FormState, Order, RecordData, Schedule, Staff } from '@/types';

/**
 * Penugasan petugas untuk satu pesanan.
 *
 * Server memverifikasi: petugas ada di domain demo yang sama, status pesanan
 * masih boleh ditugaskan, jadwal tidak bentrok, dan hasil PATCH benar-benar
 * memuat petugas yang dipilih sebelum link tugas dikirim.
 */
export async function assignOrderAction(
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
