'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import type { Order } from '@/types';
import {
  getAdminNotificationsRead,
  markAdminNotificationsRead,
} from '@/app/admin-notification-actions';
import { useOutsideDismiss } from '@/hooks/useOutsideDismiss';

const RECENT_LIMIT = 8;

/**
 * State panel notifikasi: buka/tutup, status dibaca, filter, dan aksi
 * tandai dibaca. Data pesanan datang dari server sebagai props.
 */
export function useNotifications(orders: Order[], initialRead: string[] = []) {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<string[]>(initialRead);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readStatusLoaded, setReadStatusLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const anchor = useRef<HTMLDivElement>(null);

  useOutsideDismiss(anchor, open, () => setOpen(false));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ids = await getAdminNotificationsRead();
        if (!cancelled) {
          setRead(ids);
          setReadStatusLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setError('Gagal memuat status dibaca.');
          setReadStatusLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const recent = orders.slice(0, RECENT_LIMIT);
  const unread = readStatusLoaded
    ? recent.filter((order) => !read.includes(order.id)).length
    : 0;
  const shown = recent.filter(
    (order) => !unreadOnly || !read.includes(order.id),
  );

  const markRead = (ids: string[]) => {
    setError(null);
    startTransition(async () => {
      try {
        await markAdminNotificationsRead(ids);
        setRead((previous) => [...new Set([...previous, ...ids])]);
      } catch {
        setError('Gagal menyimpan status dibaca. Silakan coba lagi.');
      }
    });
  };

  return {
    anchor,
    open,
    setOpen,
    toggle: () => setOpen((previous) => !previous),
    close: () => setOpen(false),
    read,
    unread,
    shown,
    unreadOnly,
    setUnreadOnly,
    readStatusLoaded,
    error,
    isPending,
    markRead,
    markAllRead: () => markRead(recent.map((order) => order.id)),
  };
}
