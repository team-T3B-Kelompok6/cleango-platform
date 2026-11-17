'use client';
import { useState } from 'react';
import { Modal } from '@/components/shared/ui/Modal';
import { UiIcon } from '@/components/shared/ui/UiIcon';
import { SHELL_COPY } from './data';
import { SidebarNav } from './SidebarNav';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={SHELL_COPY.openNav}
        onClick={() => setOpen(true)}
        className="hidden rounded-control p-9 text-ink max-sm:block"
      >
        <UiIcon name="menu" />
      </button>
      {open && (
        <Modal title={SHELL_COPY.navTitle} onClose={() => setOpen(false)}>
          <nav className="mobile-nav-panel">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </nav>
        </Modal>
      )}
    </>
  );
}
