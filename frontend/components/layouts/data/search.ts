/** Rute tanpa halaman pencarian sendiri: pencarian diarahkan ke pesanan. */
const SEARCH_FALLBACK: Record<string, string> = {
  '/': '/pesanan',
  '/laporan': '/pesanan',
};

export const SEARCH_LABELS: Record<string, string> = {
  '/': 'Dashboard Utama',
  '/pesanan': 'Kelola Pesanan',
  '/jadwal': 'Kelola Jadwal',
  '/layanan': 'Kelola Layanan',
  '/petugas': 'Kelola Data Petugas',
  '/customer': 'Kelola Data Customer',
  '/laporan': 'Laporan',
  '/faq': 'Kelola FAQ',
  '/audit-log': 'Audit Log Admin',
};

/** Tujuan form pencarian berdasarkan segmen rute pertama. */
export function searchTarget(section: string) {
  return SEARCH_FALLBACK[section] ?? section;
}
