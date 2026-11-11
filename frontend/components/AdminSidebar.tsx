'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { CleanGoLogo } from '@/components/CleanGoLogo';
import { Navigation } from '@/components/Navigation';
import { logoutAction } from '@/app/actions';

const KEY = 'cleango:sidebar';

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'collapsed' || saved === 'expanded') {
        setCollapsed(saved === 'collapsed');
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      const shell = document.querySelector('.app-shell');
      if (shell) shell.toggleAttribute('data-sidebar-collapsed', collapsed);
      localStorage.setItem(KEY, collapsed ? 'collapsed' : 'expanded');
    } catch {}
  }, [collapsed, ready]);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`} aria-label="Navigasi utama">
      <div className="sidebar-brand">
        <Link href="/" className="brand" aria-label="Beranda Cleango">
          <CleanGoLogo />
          <span className="brand-copy">
            <strong>
              cleango<span>•</span>
            </strong>
            <small>Layanan Kebersihan Jadi Mudah</small>
          </span>
        </Link>
        <button
          type="button"
          className="sidebar-toggle"
          aria-label={collapsed ? 'Perlebar sidebar' : 'Sempitkan sidebar'}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((previous) => !previous)}
        >
          <Icon name="chevron" />
        </button>
      </div>
      <Navigation />
      <div className="sidebar-bottom">
        <form action={logoutAction}>
          <button className="nav-link logout" type="submit" aria-label="Keluar akun">
            <Icon name="logout" />
            <span className="nav-link-label">Keluar akun</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
