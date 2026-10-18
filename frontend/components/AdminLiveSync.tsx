'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function AdminLiveSync() {
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
        // Keep the last confirmed data during a temporary connection failure.
      } finally {
        pending = false;
      }
    }
    const interval = setInterval(() => void sync(), 5000);
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
  return null;
}
