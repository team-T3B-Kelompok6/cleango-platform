import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { list } from '@/lib/api';
import type { Order } from '@/types';
import { logoutAction } from '@/app/actions';
import { Icon } from '@/components/Icon';
import { Navigation, MobileNavigation } from '@/components/Navigation';
import { Notifications } from '@/components/Notifications';
import { SearchInput } from '@/components/Filters';
export const dynamic = 'force-dynamic';
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await cookies()).has('cleango-session')) redirect('/login');
  const orders = await list<Order>('orders');
  const date = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date());
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Lewati ke konten
      </a>
      <aside className="sidebar" aria-label="Navigasi utama">
        <Link href="/" className="brand">
          <span className="brand-symbol">
            <Icon name="brand" />
          </span>
          <span>
            <strong>
              cleango<span>•</span>
            </strong>
            <small>Layanan Kebersihan Jadi Mudah</small>
          </span>
        </Link>
        <Navigation />
        <div className="sidebar-bottom">
          <div className="eco-label">
            <Icon name="leaf" />
            <span>100% Ramah Lingkungan</span>
            <i />
          </div>
          <form action={logoutAction}>
            <button className="nav-link logout">
              <Icon name="logout" />
              Keluar akun
            </button>
          </form>
        </div>
      </aside>
      <div className="workspace">
        <header className="header">
          <MobileNavigation />
          <SearchInput />
          <div className="header-right">
            <span className="header-date">
              <Icon name="calendar" />
              {date}
            </span>
            <Notifications orders={orders} />
            <button
              className="profile"
              popoverTarget="admin-profile"
              aria-label="Menu akun admin"
            >
              <span className="avatar">
                <Image src="/assets/panda.svg" alt="" width={26} height={26} />
              </span>
              <span className="profile-copy">
                <strong>Admin Operasional</strong>
                <small>SUPER ADMIN</small>
              </span>
              <Icon name="down" />
            </button>
            <div id="admin-profile" className="account-popover" popover="auto">
              <strong>Admin Operasional</strong>
              <p>Portal manajemen Cleango</p>
              <form action={logoutAction}>
                <button className="button">
                  <Icon name="logout" />
                  Keluar akun
                </button>
              </form>
            </div>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="page-content">{children}</div>
        </main>
        <footer>
          <span>
            <Icon name="engine" />
            Cleango · Pantau jadwal dan pesanan operasional
          </span>
          <span>SOP Kebersihan Hijau</span>
        </footer>
      </div>
    </div>
  );
}
