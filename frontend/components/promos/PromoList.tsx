'use client';
import { useRouter } from 'next/navigation';
import type { Promo } from '@/types/promos';
import type { Service } from '@/types';
import { promoStatus } from '@/lib/promo-rules';
import { useDialogClose } from '@/components/shared/ui/DialogContext';
import {
  Button,
  DialogBody,
  DialogFooter,
  EmptyState,
  UiIcon,
} from '@/components/shared/ui';
import { usePromoList, type PromoNotice } from '@/hooks/usePromoList';
import { PROMO_STATUSES } from '@/lib/promo-editor';
import { PromoRecord } from './PromoRecord';
import { inputClass, noticeErrorClass, noticeSuccessClass } from './data';

/** Daftar promo: filter, kartu, dan aksi aktif/nonaktif. */
export function PromoList({
  promos,
  services,
  today,
  message,
  notice,
  setNotice,
  onNew,
  onEdit,
  onDelete,
}: {
  promos: Promo[];
  services: Service[];
  today: string;
  message: string;
  notice: PromoNotice;
  setNotice: (notice: PromoNotice) => void;
  onNew: () => void;
  onEdit: (promo: Promo) => void;
  onDelete: (promo: Promo) => void;
}) {
  const close = useDialogClose();
  const router = useRouter();
  const list = usePromoList({ promos, today, setNotice });

  return (
    <>
      <DialogBody>
        <div className="mb-16 flex flex-wrap items-center justify-between gap-16 text-ink-muted">
          <span>
            {message ? 'Daftar promo' : `${promos.length} kode promo`}
          </span>
          <Button className="gap-8" onClick={onNew} disabled={list.pending}>
            <UiIcon name="plus" />
            Tambah Promo
          </Button>
        </div>
        <div className="mb-20 grid grid-cols-[minmax(0,1fr)_170px] gap-12 max-sm:grid-cols-1">
          <label className="sr-only" htmlFor="promo-search">
            Cari promo
          </label>
          <input
            type="search"
            id="promo-search"
            className={inputClass}
            placeholder="Cari nama atau kode promo…"
            value={list.query}
            onChange={(event) => list.setQuery(event.target.value)}
          />
          <label className="sr-only" htmlFor="promo-status">
            Filter status promo
          </label>
          <select
            id="promo-status"
            className={inputClass}
            value={list.status}
            onChange={(event) => list.setStatus(event.target.value)}
          >
            <option value="">Semua status</option>
            {PROMO_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
        {notice && (
          <p
            className={notice.error ? noticeErrorClass : noticeSuccessClass}
            role={notice.error ? 'alert' : 'status'}
          >
            {notice.text}
          </p>
        )}
        {message ? (
          <div className="flex flex-col items-start gap-10">
            <p className={noticeErrorClass} role="alert">
              {message}
            </p>
            <Button
              variant="ghost"
              disabled={list.pending}
              onClick={() => list.startTransition(() => router.refresh())}
            >
              {list.pending ? 'Memuat…' : 'Muat ulang'}
            </Button>
          </div>
        ) : (
          <div className="grid gap-12">
            {list.shown.map((promo) => (
              <PromoRecord
                key={promo.id}
                promo={promo}
                services={services}
                status={promoStatus(promo, today)}
                pending={list.pending}
                busy={list.busyId === promo.id}
                onEdit={() => onEdit(promo)}
                onDelete={() => onDelete(promo)}
                onToggle={() => list.toggle(promo)}
              />
            ))}
            {!list.shown.length && (
              <EmptyState
                title={
                  promos.length
                    ? 'Tidak ada promo yang sesuai'
                    : 'Belum ada kode promo'
                }
                description={
                  promos.length
                    ? 'Coba ubah pencarian atau status.'
                    : 'Tambahkan kode promo untuk dipakai pelanggan saat checkout.'
                }
              />
            )}
          </div>
        )}
      </DialogBody>
      <DialogFooter className="items-center">
        <Button variant="ghost" onClick={close ?? undefined}>
          Tutup
        </Button>
      </DialogFooter>
    </>
  );
}
