'use client';
import { useState, useTransition } from 'react';
import type { Promo } from '@/types/promos';
import { setPromoActive } from '../api/promoActions';
import { filterPromoList } from '../data/promoEditor';

export type PromoNotice = { text: string; error: boolean } | null;

/** Pencarian, filter status, dan aksi aktif/nonaktif daftar promo. */
export function usePromoList({
  promos,
  today,
  setNotice,
}: {
  promos: Promo[];
  today: string;
  setNotice: (notice: PromoNotice) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState('');
  const shown = filterPromoList(promos, { query, status }, today);

  function toggle(promo: Promo) {
    setBusyId(promo.id);
    startTransition(async () => {
      try {
        const result = await setPromoActive(promo.id, !promo.active);
        setNotice({
          text: result.success
            ? `Promo berhasil ${promo.active ? 'dinonaktifkan' : 'diaktifkan'}.`
            : result.message || 'Perubahan belum tersimpan.',
          error: !result.success,
        });
      } finally {
        setBusyId('');
      }
    });
  }

  return {
    query,
    setQuery,
    status,
    setStatus,
    pending,
    startTransition,
    busyId,
    shown,
    toggle,
  };
}
