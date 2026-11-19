import type { IconName } from '@/components/ui/Icon';

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
