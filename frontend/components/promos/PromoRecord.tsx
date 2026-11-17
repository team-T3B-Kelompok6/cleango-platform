'use client';
import type { Promo } from '@/types/promos';
import type { Service } from '@/types';
import { rupiah } from '@/lib/resources';
import { promoDateLabel, promoServiceNames } from '@/lib/promo-editor';
import { IconButton, UiIcon } from '@/components/shared/ui';

const toneClass: Record<string, string> = {
  Aktif: 'bg-success-soft text-accent-hover',
  Dijadwalkan: 'bg-info-soft text-info',
};

/** Satu kartu promo di daftar Kelola Promo. */
export function PromoRecord({
  promo,
  services,
  status,
  pending,
  busy,
  onEdit,
  onDelete,
  onToggle,
}: {
  promo: Promo;
  services: Service[];
  status: string;
  pending: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <article className="rounded-card border border-line bg-surface p-16">
      <div className="flex items-start justify-between gap-16">
        <div className="min-w-0 break-words">
          <h3 className="text-lg leading-[1.5] font-semibold text-ink">
            {promo.name}
          </h3>
          <span className="mt-6 inline-block rounded-sm bg-surface-soft px-8 py-3 text-xs text-ink-soft">
            {promo.code}
          </span>
        </div>
        <span
          className={
            'inline-flex shrink-0 items-center gap-5 rounded-full px-8 py-5 text-xs font-bold ' +
            (toneClass[status] ?? 'bg-neutral-soft text-ink-muted')
          }
        >
          <i className="size-[5px] rounded-full bg-current" />
          {status}
        </span>
      </div>
      <p className="mt-12 text-md font-semibold text-accent">
        {promo.discountType === 'percentage'
          ? `Diskon ${promo.discountValue}%`
          : `Potongan ${rupiah(promo.discountValue)}`}
        {promo.maxDiscount !== null && ` · Maks. ${rupiah(promo.maxDiscount)}`}
      </p>
      <dl className="my-16 grid grid-cols-2 gap-x-24 gap-y-12 max-sm:grid-cols-1">
        <div>
          <dt className="mb-1 text-sm text-ink-muted">Berlaku untuk</dt>
          <dd className="m-0 text-base break-words text-ink">
            {promoServiceNames(promo, services)}
          </dd>
        </div>
        <div>
          <dt className="mb-1 text-sm text-ink-muted">Periode</dt>
          <dd className="m-0 text-base text-ink">
            {promoDateLabel(promo.startsOn)} – {promoDateLabel(promo.endsOn)}
          </dd>
        </div>
        <div>
          <dt className="mb-1 text-sm text-ink-muted">Minimal transaksi</dt>
          <dd className="m-0 text-base text-ink">
            {promo.minPurchase
              ? rupiah(promo.minPurchase)
              : 'Tanpa minimal transaksi'}
          </dd>
        </div>
        <div>
          <dt className="mb-1 text-sm text-ink-muted">Pemakaian</dt>
          <dd className="m-0 text-base text-ink">
            {promo.usageLimit
              ? `Kuota ${promo.usageLimit}`
              : 'Kuota tanpa batas'}{' '}
            · {promo.perCustomerLimit}× per pelanggan
            {promo.usedCount !== undefined && ` · Dipakai ${promo.usedCount}×`}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-12 border-t border-line pt-12">
        <span className="text-sm text-ink-muted">
          Diskon dari harga normal layanan
        </span>
        <div className="flex flex-wrap items-center justify-end gap-8">
          <button
            type="button"
            className="inline-flex items-center gap-6 text-sm font-semibold text-accent hover:underline disabled:opacity-50"
            aria-label={'Ubah promo ' + promo.code}
            onClick={onEdit}
            disabled={pending}
          >
            <UiIcon name="edit" className="size-[14px]" />
            Ubah
          </button>
          <button
            type="button"
            className="inline-flex min-h-32 items-center rounded-control border border-line bg-surface px-12 py-6 text-sm text-ink-soft transition-colors hover:border-line-strong hover:bg-surface-tint disabled:opacity-50"
            aria-label={
              (promo.active ? 'Nonaktifkan' : 'Aktifkan') +
              ' promo ' +
              promo.code
            }
            onClick={onToggle}
            disabled={pending}
          >
            {busy ? 'Memproses…' : promo.active ? 'Nonaktifkan' : 'Aktifkan'}
          </button>
          <IconButton
            label={'Hapus promo ' + promo.code}
            className="size-28 rounded-sm text-danger hover:bg-danger-soft hover:text-danger"
            onClick={onDelete}
            disabled={pending}
          >
            <UiIcon name="trash" />
          </IconButton>
        </div>
      </div>
    </article>
  );
}
