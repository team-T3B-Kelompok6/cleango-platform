import type { Customer, Order } from '@/types';
import { newestOrderFirst } from './order-flow';

/** Pesanan milik customer (id bila order punya customerId, jika tidak nama). */
export type CustomerKey = { id: unknown; name?: unknown };

export function customerOrders(orders: Order[], customer: CustomerKey) {
  return orders.filter((order) =>
    order.customerId
      ? order.customerId === customer.id
      : order.customer === customer.name,
  );
}

/** Nilai yang paling sering muncul (layanan favorit, kru langganan). */
export function frequent(values: string[]) {
  const counts = new Map<string, number>();
  values
    .filter(Boolean)
    .forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts].sort((a, b) => b[1] - a[1])[0];
}

/** Ringkasan pesanan customer: jumlah, nilai selesai, favorit, kru langganan. */
export function customerStats(orders: Order[], customer: CustomerKey) {
  const own = customerOrders(orders, customer);
  const completed = own
    .filter((order) => order.status === 'Selesai')
    .sort(newestOrderFirst);
  return {
    orders: own,
    completed,
    totalSpent: completed.reduce((sum, order) => sum + order.price, 0),
    favorite: frequent(completed.map((order) => order.service)),
    regular: frequent(completed.flatMap((order) => [...new Set(order.staff)])),
  };
}

/** Rating kru dari pelanggan (0–5) atau "Belum ada". */
export function customerRatingLabel(customer: Customer) {
  return typeof customer.crewRating === 'number' &&
    customer.crewRating >= 0 &&
    customer.crewRating <= 5
    ? customer.crewRating.toFixed(1)
    : 'Belum ada';
}

/** Label "Terdaftar sejak <tanggal>" (bulan singkat, WIB). */
export function customerJoinedLabel(value: unknown) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))
    return 'Belum tersedia';
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
}
