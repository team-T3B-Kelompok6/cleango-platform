import type { Order } from '@/types';

export const REPORT_TABS = [
  'Ringkasan Bulanan',
  'Laporan Harian',
  'Laporan Per Pelanggan',
  'Laporan Performa Kru',
] as const;

export type ReportTab = (typeof REPORT_TABS)[number];

export type ReportGroup = { name: string; count: number; amount: number };

export type PaymentEntry = { name: string; count: number; percent: number };

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Bulan laporan `YYYY-MM` yang valid, atau '' bila kosong/salah. */
export function parseReportMonth(value: unknown) {
  return typeof value === 'string' && MONTH_PATTERN.test(value) ? value : '';
}

/** Tab laporan aktif; kembali ke tab pertama bila tidak dikenal. */
export function reportTab(value: unknown): ReportTab {
  return typeof value === 'string' &&
    (REPORT_TABS as readonly string[]).includes(value)
    ? (value as ReportTab)
    : REPORT_TABS[0];
}

/** Pesanan selesai pada periode terpilih (tanpa bulan = semua periode). */
export function completedOrders(orders: Order[], month: string) {
  return orders.filter(
    (order) =>
      order.status === 'Selesai' && (!month || order.date.startsWith(month)),
  );
}

/** Angka utama halaman laporan. */
export function reportSummary(orders: Order[]) {
  return {
    total: orders.reduce((sum, order) => sum + order.price, 0),
    customers: new Set(orders.map((order) => order.customer)).size,
    count: orders.length,
  };
}

/**
 * Total per minggu dalam bulan. Tanggal 29–31 masuk minggu keempat karena
 * laporan hanya menampilkan empat kolom minggu.
 */
export function weeklyTotals(orders: Order[]) {
  const weeks = [0, 0, 0, 0];
  for (const order of orders) {
    const day = Number(order.date.slice(-2));
    if (!Number.isFinite(day) || day < 1) continue;
    weeks[Math.min(3, Math.floor((day - 1) / 7))] += order.price;
  }
  return weeks;
}

/** Tinggi bar chart dalam persen (minimal 2% agar tetap terlihat). */
export function barHeight(weeks: number[], value: number) {
  return Math.max(2, Math.round((value / Math.max(1, ...weeks)) * 90)) + '%';
}

/** Sebaran metode pembayaran beserta persentasenya. */
export function paymentBreakdown(orders: Order[]) {
  const counts = new Map<string, number>();
  for (const order of orders) {
    if (!order.paymentMethod) continue;
    counts.set(order.paymentMethod, (counts.get(order.paymentMethod) ?? 0) + 1);
  }
  const base = Math.max(1, orders.length);
  return {
    total: orders.length,
    entries: Array.from(counts, ([name, count]): PaymentEntry => ({
      name,
      count,
      percent: Math.round((count / base) * 100),
    })),
    missing: orders.filter((order) => !order.paymentMethod).length,
  };
}

/** Grouping tab harian/pelanggan/kru; satu order bisa dihitung untuk >1 kru. */
export function groupReport(orders: Order[], tab: ReportTab): ReportGroup[] {
  if (tab === REPORT_TABS[0]) return [];
  const grouped = new Map<string, { count: number; amount: number }>();
  for (const order of orders) {
    const keys =
      tab === REPORT_TABS[1]
        ? [order.date]
        : tab === REPORT_TABS[2]
          ? [order.customer]
          : order.staff;
    for (const key of keys) {
      const value = grouped.get(key) ?? { count: 0, amount: 0 };
      grouped.set(key, {
        count: value.count + 1,
        amount: value.amount + order.price,
      });
    }
  }
  return Array.from(grouped, ([name, data]) => ({ name, ...data }));
}

/** Label periode pada tombol, mis. "Bulan November 2026". */
export function reportMonthLabel(month: string) {
  if (!month) return 'Semua Periode';
  return (
    'Bulan ' +
    new Date(month + '-01T00:00:00+07:00').toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    })
  );
}

/** Tautan halaman laporan dengan periode dan tab yang dipertahankan. */
export function reportHref({
  month,
  tab,
  page = 1,
}: {
  month?: string;
  tab?: ReportTab | string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (month) params.set('month', month);
  if (tab) params.set('tab', tab);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? '/laporan?' + query : '/laporan';
}

/** Tautan unduhan CSV untuk periode terpilih. */
export function reportExportHref(month: string) {
  return (
    '/laporan/export' + (month ? '?month=' + encodeURIComponent(month) : '')
  );
}

function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

/** Isi CSV laporan: BOM + CRLF, aman dari formula injection. */
export function reportCsv(orders: Order[]) {
  const rows = [
    ['ID', 'Pelanggan', 'Layanan', 'Tanggal', 'Status', 'Harga'],
    ...orders.map((order) => [
      order.id,
      order.customer,
      order.service,
      order.date,
      order.status,
      order.price,
    ]),
  ];
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

/** Nama berkas unduhan; menyertakan periode bila ada. */
export function reportFilename(month: string) {
  return 'laporan-cleango' + (month ? '-' + month : '') + '.csv';
}
