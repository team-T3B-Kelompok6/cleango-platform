'use client';
import { useEffect, type ReactNode } from 'react';
import { useUiStore } from '@/store/uiStore';
import { Footer } from '../Footer';
import { LiveSync } from './LiveSync';
import { SHELL_COPY } from '../data';
import { Sidebar } from '../sidebar/Sidebar';
import { Topbar } from '../topbar/Topbar';

export function AdminShell({
  date,
  headerActions,
  children,
}: {
  date: string;
  headerActions: ReactNode;
  children: ReactNode;
}) {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggle = useUiStore((state) => state.toggleSidebar);
  const restore = useUiStore((state) => state.restoreSidebar);

  useEffect(() => {
    restore();
  }, [restore]);

  return (
    <div
      className="group min-h-dvh bg-canvas"
      data-collapsed={collapsed ? 'true' : undefined}
    >
      <LiveSync />
      <a
        href="#main-content"
        className="fixed top-[-60px] left-260 z-100 bg-surface p-12 transition-[top] focus:top-10 group-data-[collapsed=true]:left-20"
      >
        {SHELL_COPY.skipToContent}
      </a>
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className="flex min-h-dvh flex-col pl-240 transition-[padding] duration-200 group-data-[collapsed=true]:pl-72 max-md:pl-220 max-sm:pl-0">
        <Topbar date={date} actions={headerActions} />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1480px] flex-1 px-34 py-28 outline-none max-md:px-24 max-md:py-24 max-sm:px-18 min-[1440px]:pt-34"
        >
          <div className="page-content">{children}</div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
