import 'server-only';
import { detail, list } from '@/lib/api';
import type { Order, Schedule, Staff } from '@/types';

/**
 * Baca pesanan (dengan validasi bentuk dari `list`/`detail`).
 * `list` menolak item tanpa `id`, `detail` memetakan 404 ke `notFound()`.
 */
export async function getOrders(): Promise<Order[]> {
  return list<Order>('orders');
}

export async function getOrder(id: string): Promise<Order> {
  return detail<Order>('orders', id);
}

/**
 * Data pendukung dialog penugasan. Dimuat bersamaan agar satu dialog hanya
 * menunggu satu putaran jaringan.
 */
export async function getAssignmentLookups(): Promise<{
  staff: Staff[];
  schedules: Schedule[];
  orders: Order[];
}> {
  const [staff, schedules, orders] = await Promise.all([
    list<Staff>('staff'),
    list<Schedule>('schedules'),
    list<Order>('orders'),
  ]);
  return { staff, schedules, orders };
}
