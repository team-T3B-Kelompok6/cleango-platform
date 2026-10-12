'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Icon, type IconName } from './Icon';
import { Modal } from './Modal';
import { UiIcon } from './UiIcon';
const links: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Dashboard Utama', icon: 'dashboard' },
  { href: '/pesanan', label: 'Kelola Pesanan', icon: 'package' },
  { href: '/jadwal', label: 'Kelola Jadwal', icon: 'schedule' },
  { href: '/layanan', label: 'Kelola Layanan', icon: 'services' },
  { href: '/faq', label: 'Kelola FAQ', icon: 'faq' },
  { href: '/customer', label: 'Kelola Data Customer', icon: 'customers' },
  { href: '/petugas', label: 'Kelola Data Petugas', icon: 'staff' },
  { href: '/laporan', label: 'Laporan', icon: 'report' },
];
function Links({ close }: { close?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={
            'nav-link ' +
            (link.href === '/' ? 'dashboard-nav ' : '') +
            ((
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href)
            )
              ? 'active'
              : '')
          }
          data-status={
            (
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href)
            )
              ? 'active'
              : 'inactive'
          }
          aria-current={
            (
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href)
            )
              ? 'page'
              : undefined
          }
          onClick={close}
        >
          <Icon name={link.icon} />
          {link.label}
        </Link>
      ))}
    </>
  );
}
export function Navigation() {
  return (
    <nav>
      <Links />
    </nav>
  );
}
export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="mobile-toggle"
        aria-label="Buka navigasi"
        onClick={() => setOpen(true)}
      >
        <UiIcon name="menu" />
      </button>
      {open && (
        <Modal title="Navigasi Cleango" onClose={() => setOpen(false)}>
          <nav className="mobile-nav-panel">
            <Links close={() => setOpen(false)} />
          </nav>
        </Modal>
      )}
    </>
  );
}
