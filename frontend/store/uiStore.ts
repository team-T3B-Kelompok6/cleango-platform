'use client';

import { create } from 'zustand';

const STORAGE_KEY = 'cleango:sidebar';

interface UiState {
  /** Sidebar admin menyempit. Hanya UI, tidak memengaruhi data. */
  sidebarCollapsed: boolean;
  /** `false` sampai localStorage selesai dibaca (hindari flicker/hydration beda). */
  sidebarReady: boolean;
  toggleSidebar: () => void;
  restoreSidebar: () => void;
}

/**
 * State UI global. Jangan menyimpan data server (pesanan, sesi, token) di sini;
 * data API tetap milik TanStack Query, sesi tetap di cookie HTTP-only.
 */
export const useUiStore = create<UiState>()((set, get) => ({
  sidebarCollapsed: false,
  sidebarReady: false,

  toggleSidebar: () => {
    const sidebarCollapsed = !get().sidebarCollapsed;
    set({ sidebarCollapsed });
    try {
      localStorage.setItem(
        STORAGE_KEY,
        sidebarCollapsed ? 'collapsed' : 'expanded',
      );
    } catch {
      // localStorage bisa diblokir; pilihan hanya berlaku untuk sesi ini.
    }
  },

  restoreSidebar: () => {
    if (get().sidebarReady) return;
    let sidebarCollapsed = false;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'collapsed' || saved === 'expanded') {
        sidebarCollapsed = saved === 'collapsed';
      }
    } catch {
      // pakai nilai default
    }
    set({ sidebarCollapsed, sidebarReady: true });
  },
}));
