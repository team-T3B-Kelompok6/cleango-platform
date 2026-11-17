'use client';
import { useActionState, useEffect, useRef } from 'react';
import type { Promo, PromoActionState } from '@/types/promos';
import { removePromo } from '@/app/promo-actions';
import {
  DialogBody,
  DialogFooter,
  Button,
  buttonVariants,
  SubmitButton,
} from '@/components/shared/ui';
import { hintClass, noticeErrorClass } from './data';

/** Konfirmasi hapus promo di dalam dialog Kelola Promo. */
export function PromoDelete({
  promo,
  onCancel,
  onDeleted,
}: {
  promo: Promo;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const [state, action] = useActionState<PromoActionState, FormData>(
    removePromo.bind(null, promo.id),
    {},
  );
  const completed = useRef(false);
  useEffect(() => {
    if (state.success && !completed.current) {
      completed.current = true;
      onDeleted();
    }
  }, [state, onDeleted]);
  return (
    <form action={action} className="flex min-h-0 flex-1 flex-col">
      <DialogBody className="flex flex-col gap-12">
        <p className="text-base leading-[1.6] text-ink">
          Hapus promo <strong>{promo.name}</strong> dengan kode{' '}
          <strong>{promo.code}</strong>?
        </p>
        <p className={hintClass}>
          Kode promo tidak dapat digunakan setelah dihapus.
        </p>
        {state.message && (
          <p className={noticeErrorClass} role="alert">
            {state.message}
          </p>
        )}
      </DialogBody>
      <DialogFooter className="items-center">
        <Button variant="ghost" onClick={onCancel}>
          Batal
        </Button>
        <SubmitButton
          className={buttonVariants({
            variant: 'danger',
            className: 'disabled:opacity-45',
          })}
          pendingLabel="Menghapus…"
        >
          Hapus promo
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
