import type { Order } from '@/types';
import { list } from '@/lib/api';
import { needsAssignment, newestOrderFirst } from '@/lib/order-flow';
import { withOrderWorkTimes } from '@/lib/order-work-times';

const JAKARTA = 'Asia/Jakarta';

export type DashboardTotals = {
  today: number;
  working: number;
  waiting: number;
  done: number;
};

export type DashboardSummary = {
  totals: DashboardTotals;
  recent: Order[];
  greeting: string;
  updatedAt: string;
};

function todayKey(now: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: JAKARTA }).format(now);
}

function longDate(now: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeZone: JAKARTA,
  }).format(now);
}

function clock(now: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: JAKARTA,
  }).format(now);
}

/** Hitungan ringkasan dashboard; dipisah dari komponen agar bisa diuji. */
function summarize(orders: Order[], now = new Date()): DashboardSummary {
  const today = todayKey(now);
  const daily = orders.filter((order) => order.date === today);
  const count = (status: string) =>
    daily.filter((order) => order.status === status).length;

  return {
    totals: {
      today: daily.length,
      working: count('Sedang Dikerjakan'),
      waiting: daily.filter(needsAssignment).length,
      done: count('Selesai'),
    },
    recent: orders.slice(0, 3),
    greeting: longDate(now),
    updatedAt: clock(now),
  };
}

/** Data mentah dashboard: pesanan terbaru yang sudah dilengkapi jam kerja. */
export async function loadDashboardOrders(): Promise<Order[]> {
  const orders = [
    ...(await withOrderWorkTimes(await list<Order>('orders'))),
  ].sort(newestOrderFirst);
  return orders;
}

export function summarizeOrders(
  orders: Order[],
  now = new Date(),
): DashboardSummary {
  return summarize(orders, now);
}
