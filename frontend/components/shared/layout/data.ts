import type { IconName } from '@/components/shared/ui/Icon';

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Dashboard Utama', icon: 'dashboard' },
  { href: '/pesanan', label: 'Kelola Pesanan', icon: 'package' },
  { href: '/jadwal', label: 'Kelola Jadwal', icon: 'schedule' },
  { href: '/layanan', label: 'Kelola Layanan', icon: 'services' },
  { href: '/faq', label: 'Kelola FAQ', icon: 'faq' },
  { href: '/customer', label: 'Kelola Data Customer', icon: 'customers' },
  { href: '/petugas', label: 'Kelola Data Petugas', icon: 'staff' },
  { href: '/laporan', label: 'Laporan', icon: 'report' },
  { href: '/audit-log', label: 'Audit Log Admin', icon: 'clock' },
];

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

export const SHELL_COPY = {
  skipToContent: 'Lewati ke konten',
  navLabel: 'Navigasi utama',
  openNav: 'Buka navigasi',
  navTitle: 'Navigasi Cleango',
  sidebarExpand: 'Perlebar sidebar',
  sidebarCollapse: 'Sempitkan sidebar',
  home: 'Beranda Cleango',
  brand: 'cleango',
  tagline: 'Layanan Kebersihan Jadi Mudah',
  logout: 'Keluar akun',
  profileMenu: 'Menu akun admin',
  profileName: 'Admin Operasional',
  profileRole: 'SUPER ADMIN',
  profileTitle: 'Portal manajemen Cleango',
  search: 'Cari data',
  searchSubmit: 'Jalankan pencarian',
  notifications: {
    trigger: 'Lihat notifikasi',
    panel: 'Notifikasi',
    title: 'Notifikasi',
    all: 'Semua',
    unread: 'Belum dibaca',
    markAll: 'Tandai semua dibaca',
    emptyUnread: 'Semua aktivitas sudah dibaca.',
    empty: 'Belum ada aktivitas pesanan.',
    footer: 'Dari aktivitas pesanan terbaru',
    headerNote: 'Aktivitas pesanan terbaru',
    seeAll: 'Lihat semua pesanan',
    loadError: 'Gagal memuat status dibaca.',
    saveError: 'Gagal menyimpan status dibaca. Silakan coba lagi.',
    viewOrder: 'Lihat pesanan',
  },
  footer: {
    note: 'Pantau jadwal dan pesanan operasional',
    sop: 'SOP Kebersihan Hijau',
  },
} as const;
