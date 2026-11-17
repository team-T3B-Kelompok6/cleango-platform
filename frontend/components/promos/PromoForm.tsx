'use client';
import { useActionState, useId, useRef, useEffect } from 'react';
import { savePromo } from '@/app/promo-actions';
import type { Promo, PromoActionState } from '@/types/promos';
import type { Service } from '@/types';
import {
  DialogBody,
  DialogFooter,
  Button,
  SubmitButton,
} from '@/components/shared/ui';
import { usePromoForm } from '@/hooks/usePromoForm';
import { PromoServicePicker } from './PromoServicePicker';
import {
  columnClass,
  columnTitleClass,
  errorClass,
  fieldClass,
  hintClass,
  inputClass,
  labelClass,
  noticeErrorClass,
  optionClass,
  optionIdleClass,
  optionSelectedClass,
  pairClass,
} from './data';

/** Form tambah/ubah promo: detail + periode di kiri, layanan & pratinjau di kanan. */
export function PromoForm({
  initial,
  services,
  today,
  onSaved,
  onCancel,
}: {
  initial?: Promo;
  services: Service[];
  today: string;
  onSaved: (promo: Promo) => void;
  onCancel: () => void;
}) {
  const baseId = useId();
  const [state, action] = useActionState<PromoActionState, FormData>(
    savePromo.bind(null, initial?.id ?? null),
    {},
  );
  const completed = useRef(false);
  const form = usePromoForm({ initial, services, today });

  useEffect(() => {
    if (state.success && state.promo && !completed.current) {
      completed.current = true;
      onSaved(state.promo);
    }
  }, [state, state.promo, onSaved]);

  const error = (name: string) =>
    state.errors?.[name] ? (
      <span className={errorClass} id={baseId + '-' + name + '-error'}>
        {state.errors[name]}
      </span>
    ) : null;

  function input(
    name: string,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
    hint?: string,
  ) {
    return (
      <div className={fieldClass}>
        <label htmlFor={baseId + '-' + name} className={labelClass}>
          {label}
        </label>
        <input
          {...props}
          className={inputClass}
          id={baseId + '-' + name}
          name={name}
          value={form.values[name]}
          onChange={(event) => form.change(name, event.target.value)}
          aria-invalid={!!state.errors?.[name]}
          aria-describedby={
            [
              hint && baseId + '-' + name + '-hint',
              state.errors?.[name] && baseId + '-' + name + '-error',
            ]
              .filter(Boolean)
              .join(' ') || undefined
          }
        />
        {hint && (
          <small className={hintClass} id={baseId + '-' + name + '-hint'}>
            {hint}
          </small>
        )}
        {error(name)}
      </div>
    );
  }

  const knownFields = [
    'name',
    'code',
    'discountType',
    'discountValue',
    'maxDiscount',
    'minPurchase',
    'scope',
    'serviceIds',
    'startsOn',
    'endsOn',
    'usageLimit',
    'perCustomerLimit',
    'stackable',
    'active',
    'bannerImage',
  ];

  return (
    <form action={action} className="flex min-h-0 flex-1 flex-col">
      <DialogBody className="flex flex-col gap-18">
        <div className="grid grid-cols-2 gap-28 max-md:grid-cols-1">
          <section className={columnClass} aria-labelledby={baseId + '-detail'}>
            <h3 className={columnTitleClass} id={baseId + '-detail'}>
              Detail promo
            </h3>
            {input('name', 'Nama promo', {
              required: true,
              maxLength: 80,
              placeholder: 'Contoh: Hemat Bersih Oktober',
            })}
            {input(
              'code',
              'Kode promo',
              {
                required: true,
                minLength: 3,
                maxLength: 30,
                placeholder: 'Contoh: CLEANHEMAT',
                autoCapitalize: 'characters',
                autoComplete: 'off',
              },
              'Kode yang dimasukkan pelanggan saat checkout.',
            )}
            <div className={pairClass}>
              <div className={fieldClass}>
                <label htmlFor={baseId + '-type'} className={labelClass}>
                  Jenis diskon
                </label>
                <select
                  id={baseId + '-type'}
                  name="discountType"
                  className={inputClass}
                  value={form.values.discountType}
                  onChange={(event) =>
                    form.change('discountType', event.target.value)
                  }
                  aria-invalid={!!state.errors?.discountType}
                >
                  <option value="percentage">Persentase (%)</option>
                  <option value="fixed">Nominal (Rp)</option>
                </select>
                {error('discountType')}
              </div>
              {input(
                'discountValue',
                form.values.discountType === 'percentage'
                  ? 'Diskon (%)'
                  : 'Potongan (Rp)',
                {
                  type: 'number',
                  required: true,
                  min: 1,
                  max:
                    form.values.discountType === 'percentage' ? 100 : undefined,
                  step: 1,
                },
              )}
            </div>
            <div
              className={
                form.values.discountType === 'fixed'
                  ? 'grid grid-cols-1 gap-14'
                  : pairClass
              }
            >
              {form.values.discountType === 'percentage' &&
                input(
                  'maxDiscount',
                  'Maksimal potongan (Rp)',
                  {
                    type: 'number',
                    min: 1,
                    step: 1,
                    placeholder: 'Tanpa batas',
                  },
                  'Opsional; membatasi potongan dari diskon persen.',
                )}
              {input(
                'minPurchase',
                'Minimal transaksi (Rp)',
                { type: 'number', required: true, min: 0, step: 1 },
                'Isi 0 jika tidak ada minimal transaksi.',
              )}
            </div>
            <h3 className={columnTitleClass}>Periode & batas pemakaian</h3>
            <div className={pairClass}>
              {input('startsOn', 'Mulai berlaku', {
                type: 'date',
                required: true,
              })}
              {input('endsOn', 'Berlaku sampai', {
                type: 'date',
                required: true,
                min: form.values.startsOn,
              })}
            </div>
            <p className={hintClass}>
              Berlaku sampai akhir tanggal yang dipilih, waktu Indonesia Barat.
            </p>
            <div className={pairClass}>
              {input('usageLimit', 'Kuota total', {
                type: 'number',
                min: 1,
                step: 1,
                placeholder: 'Tanpa batas',
              })}
              {input(
                'perCustomerLimit',
                'Batas per pelanggan',
                { type: 'number', required: true, min: 1, step: 1 },
                'Jumlah pemakaian untuk setiap pelanggan.',
              )}
            </div>
            <input type="hidden" name="active" value={form.values.active} />
            <label
              className={
                optionClass +
                ' ' +
                (form.values.active === 'true'
                  ? optionSelectedClass
                  : optionIdleClass)
              }
            >
              <input
                type="checkbox"
                className="mt-1 size-16 shrink-0 accent-accent"
                checked={form.values.active === 'true'}
                onChange={(event) =>
                  form.change('active', String(event.target.checked))
                }
              />
              <span className="flex min-w-0 flex-col gap-4">
                <strong className="text-base leading-[1.5] font-medium text-ink">
                  Promo aktif
                </strong>
                <small className={hintClass}>
                  Dapat digunakan selama periode dan kuota masih berlaku.
                </small>
              </span>
            </label>
            {error('active')}
            <div className={fieldClass}>
              <label htmlFor={baseId + '-banner'} className={labelClass}>
                Banner promo (opsional)
              </label>
              <input
                id={baseId + '-banner'}
                type="file"
                name="bannerImage"
                accept="image/png,image/jpeg,image/webp"
                className="block w-full text-sm text-ink-muted"
                aria-describedby={baseId + '-banner-hint'}
                onChange={(event) => form.selectBanner(event.target.files?.[0])}
              />
              <small className={hintClass} id={baseId + '-banner-hint'}>
                JPG, PNG, atau WebP · maks. 2 MB. Disarankan 1200 × 400 px.
              </small>
              {form.bannerPreview ? (
                <div className="grid aspect-[3/1] w-full place-items-center overflow-hidden rounded-md border border-dashed border-line">
                  <img
                    src={form.bannerPreview}
                    alt="Pratinjau banner promo"
                    className="h-full w-full object-contain"
                    onError={() => form.setBannerPreview(null)}
                  />
                </div>
              ) : (
                <p className={hintClass}>Pratinjau gambar banner</p>
              )}
              {form.bannerError && (
                <p className={errorClass} role="alert">
                  {form.bannerError}
                </p>
              )}
              {error('bannerImage')}
            </div>
          </section>

          <PromoServicePicker
            baseId={baseId}
            values={form.values}
            onChange={form.change}
            error={error}
            selected={form.selected}
            onToggle={form.toggleService}
            onClear={form.clearSelected}
            query={form.query}
            onQuery={form.setQuery}
            found={form.found}
            choices={form.choices}
            example={form.example}
            onExample={form.setExampleId}
            quote={form.quote}
          />
        </div>
        {state.message && (
          <p className={noticeErrorClass} role="alert">
            {state.message}
          </p>
        )}
        {Object.entries(state.errors ?? {})
          .filter(([name]) => !knownFields.includes(name))
          .map(([name, message]) => (
            <p key={name} className={errorClass} role="alert">
              {message}
            </p>
          ))}
      </DialogBody>
      <DialogFooter className="items-center">
        <Button variant="ghost" onClick={onCancel}>
          Batal
        </Button>
        <SubmitButton>Simpan promo</SubmitButton>
      </DialogFooter>
    </form>
  );
}
