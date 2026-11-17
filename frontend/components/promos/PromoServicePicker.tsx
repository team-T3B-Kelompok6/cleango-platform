'use client';
import type { Service } from '@/types';
import type { PromoQuote } from '@/lib/promo-editor';
import { rupiah } from '@/lib/resources';
import { PromoPreview } from './PromoPreview';
import {
  columnClass,
  columnTitleClass,
  hintClass,
  inputClass,
  optionClass,
  optionIdleClass,
  optionSelectedClass,
} from './data';

type Values = Record<string, string>;

/** Pilih cakupan layanan, daftar layanan, dan pratinjau harga promo. */
export function PromoServicePicker({
  baseId,
  values,
  onChange,
  error,
  selected,
  onToggle,
  onClear,
  query,
  onQuery,
  found,
  choices,
  example,
  onExample,
  quote,
}: {
  baseId: string;
  values: Values;
  onChange: (name: string, value: string) => void;
  error: (name: string) => React.ReactNode;
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
  onClear: () => void;
  query: string;
  onQuery: (value: string) => void;
  found: Service[];
  choices: Service[];
  example?: Service;
  onExample: (id: string) => void;
  quote: PromoQuote | null;
}) {
  function scopeCard(value: 'all' | 'services', title: string, hint: string) {
    const active = values.scope === value;
    return (
      <label
        className={
          optionClass + ' ' + (active ? optionSelectedClass : optionIdleClass)
        }
      >
        <input
          type="radio"
          name="scope"
          value={value}
          className="mt-1 size-16 shrink-0 accent-accent"
          checked={active}
          onChange={() => onChange('scope', value)}
        />
        <span className="flex min-w-0 flex-col gap-4">
          <strong className="text-base leading-[1.5] font-medium text-ink">
            {title}
          </strong>
          <small className={hintClass}>{hint}</small>
        </span>
      </label>
    );
  }

  return (
    <section className={columnClass} aria-labelledby={baseId + '-services'}>
      <h3 className={columnTitleClass} id={baseId + '-services'}>
        Layanan yang mendapat promo
      </h3>
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="sr-only">Cakupan layanan</legend>
        <div className="grid grid-cols-2 gap-10 max-sm:grid-cols-1">
          {scopeCard(
            'all',
            'Semua layanan',
            'Termasuk layanan yang ditambahkan nanti.',
          )}
          {scopeCard(
            'services',
            'Pilih layanan',
            'Pilih satu atau beberapa layanan.',
          )}
        </div>
        {error('scope')}
      </fieldset>

      {values.scope === 'services' && (
        <div className="flex flex-col gap-10">
          <label className="sr-only" htmlFor={baseId + '-search'}>
            Cari layanan untuk promo
          </label>
          <input
            id={baseId + '-search'}
            type="search"
            className={inputClass}
            placeholder="Cari nama atau kategori layanan…"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
          />
          <div className="flex flex-wrap items-center justify-between gap-8">
            <small className={hintClass}>
              {selected.length} layanan dipilih
            </small>
            <button
              type="button"
              className="inline-flex items-center gap-6 text-sm font-semibold text-accent hover:underline disabled:opacity-50"
              onClick={onClear}
              disabled={!selected.length}
            >
              Bersihkan pilihan
            </button>
          </div>
          <div className="flex max-h-260 flex-col gap-8 overflow-y-auto">
            {found.map((service) => (
              <label
                key={service.id}
                className={
                  optionClass +
                  ' ' +
                  (selected.includes(service.id)
                    ? optionSelectedClass
                    : optionIdleClass)
                }
              >
                <input
                  type="checkbox"
                  className="mt-1 size-16 shrink-0 accent-accent"
                  checked={selected.includes(service.id)}
                  onChange={(event) =>
                    onToggle(service.id, event.target.checked)
                  }
                />
                <span className="flex min-w-0 flex-col gap-4">
                  <strong className="text-base leading-[1.5] font-medium text-ink">
                    {service.name}
                  </strong>
                  <small className={hintClass}>
                    {service.category} · {rupiah(service.price)}
                    {!service.active ? ' · Nonaktif' : ''}
                  </small>
                </span>
              </label>
            ))}
            {!found.length && (
              <p className={hintClass}>Tidak ada layanan yang sesuai.</p>
            )}
          </div>
          {selected.map((id) => (
            <input type="hidden" name="serviceIds" key={id} value={id} />
          ))}
        </div>
      )}
      {error('serviceIds')}
      <input type="hidden" name="stackable" value="false" />
      <PromoPreview
        baseId={baseId}
        choices={choices}
        example={example}
        onExample={onExample}
        quote={quote}
      />
    </section>
  );
}
