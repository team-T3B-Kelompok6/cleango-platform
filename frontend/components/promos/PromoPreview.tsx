'use client';
import type { Service } from '@/types';
import type { PromoQuote } from '@/lib/promo-editor';
import { rupiah } from '@/lib/resources';
import { hintClass, inputClass } from './data';

/** Pratinjau harga layanan setelah diskon promo. */
export function PromoPreview({
  baseId,
  choices,
  example,
  onExample,
  quote,
}: {
  baseId: string;
  choices: Service[];
  example?: Service;
  onExample: (id: string) => void;
  quote: PromoQuote | null;
}) {
  return (
    <div className="rounded-card border border-line bg-surface-soft p-12">
      <h4 className="text-sm font-semibold text-ink">Preview harga layanan</h4>
      {example && quote ? (
        <>
          <label className="sr-only" htmlFor={baseId + '-example'}>
            Pilih layanan untuk preview harga
          </label>
          <select
            id={baseId + '-example'}
            className={inputClass + ' mt-8'}
            value={example.id}
            onChange={(event) => onExample(event.target.value)}
          >
            {choices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          <dl className="mt-10 grid gap-6">
            <div className="flex items-center justify-between gap-12 text-sm">
              <dt className="text-ink-muted">Harga layanan</dt>
              <dd className="m-0 font-medium text-ink">
                {rupiah(quote.price)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-12 text-sm">
              <dt className="text-ink-muted">Potongan kode</dt>
              <dd className="m-0 font-medium text-danger">
                −{rupiah(quote.discount)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-12 border-t border-line pt-6 text-base">
              <dt className="font-semibold text-ink">
                Harga setelah diskon promo
              </dt>
              <dd className="m-0 font-bold text-accent">
                {rupiah(quote.total)}
              </dd>
            </div>
          </dl>
          {quote.reason && <p className={hintClass}>{quote.reason}</p>}
        </>
      ) : (
        <p className="mt-6 text-sm text-ink-muted">
          Pilih layanan untuk melihat harga setelah diskon.
        </p>
      )}
      <small className={hintClass}>
        Belum termasuk biaya tambahan saat checkout.
      </small>
    </div>
  );
}
