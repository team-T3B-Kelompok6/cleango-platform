'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const INTERVAL_MS = 5000;

/** Polling ringan: refresh server component saat data petugas berubah. */
export function useAdminLiveSync() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const controller = new AbortController();
    let previous = '';
    let pending = false;

    async function sync() {
      if (
        document.hidden ||
        pending ||
        document.querySelector('dialog[open].tracking-dialog') ||
        document.activeElement?.matches(
          'input:not([readonly]), textarea, select',
        )
      )
        return;
      pending = true;
      try {
        const response = await fetch('/api/admin/cleaner-tasks', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) return;
        const result = await response.json();
        const next =
          result.data?.revision || JSON.stringify(result.data?.items);
        if (next && next !== previous) router.refresh();
        if (next) previous = next;
      } catch {
        // Pertahankan data terakhir saat koneksi sementara gagal.
      } finally {
        pending = false;
      }
    }

    const interval = setInterval(() => void sync(), INTERVAL_MS);
    const onVisible = () => void sync();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    void sync();
    return () => {
      clearInterval(interval);
      controller.abort();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [pathname, router]);
}
