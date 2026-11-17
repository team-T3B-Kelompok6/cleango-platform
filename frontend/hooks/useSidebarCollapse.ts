'use client';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cleango:sidebar';

/** Simpan pilihan lebar sidebar di localStorage, hindari flicker sebelum siap. */
export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'collapsed' || saved === 'expanded') {
        setCollapsed(saved === 'collapsed');
      }
    } catch {
      // localStorage bisa diblokir; pakai nilai default.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? 'collapsed' : 'expanded');
    } catch {
      // abaikan
    }
  }, [collapsed, ready]);

  return {
    collapsed,
    ready,
    toggle: () => setCollapsed((previous) => !previous),
  };
}
