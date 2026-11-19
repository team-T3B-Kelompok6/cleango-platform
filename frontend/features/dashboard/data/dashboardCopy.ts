import type { DashboardTotals } from './dashboardSummary';

export const DASHBOARD_COPY = {
  title: 'Halo, Admin Cleango!',
  intro: (date: string) =>
    `Berikut ringkasan operasional kebersihan hari ini, ${date}.`,
  announcement: {
    title: 'Pengumuman Operasional Hari Ini',
    body: 'Pastikan seluruh kru kebersihan sudah tiba di lokasi tepat 15 menit sebelum jam pengerjaan dan mengisi checklist SOP.',
  },
  metrics: {
    title: 'Ringkasan Pesanan Hari Ini',
    updated: (time: string) => `Diperbarui: ${time} WIB`,
  },
  activity: {
    title: 'Ringkasan Aktivitas Pesanan Terbaru',
    seeAll: 'Lihat Semua di Kelola Pesanan',
    emptyTitle: 'Belum ada pesanan',
    emptyBody:
      'Pesanan akan muncul setelah pelanggan memesan melalui aplikasi.',
    emptyAction: 'Kelola pesanan',
    unassignedStaff: 'Belum Ditugaskan',
  },
} as const;

/** Kartu metrik dashboard, urut sesuai tampilan. */
export function buildMetrics(totals: DashboardTotals) {
  return [
    {
      label: 'Pesanan hari ini',
      value: totals.today,
      unit: 'Order',
      note: 'Pesanan terdaftar hari ini',
      icon: 'orders',
    },
    {
      label: 'Sedang dikerjakan',
      value: totals.working,
      unit: 'Lokasi',
      note: 'Kru aktif di lapangan',
      icon: 'working',
      tone: 'blue',
    },
    {
      label: 'Menunggu petugas',
      value: totals.waiting,
      unit: 'Order',
      note: 'Perlu tindakan segera',
      icon: 'clock',
      tone: 'amber',
    },
    {
      label: 'Selesai hari ini',
      value: totals.done,
      unit: 'Selesai',
      note: 'Pengerjaan telah selesai',
      icon: 'check',
    },
  ] as const;
}
