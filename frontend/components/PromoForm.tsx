'use client';
import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
} from 'react';
import { savePromo } from '@/app/promo-actions';
import { quotePromo } from '@/lib/promo-rules';
import { rupiah } from '@/lib/resources';
import type { Promo, PromoActionState } from '@/types/promos';
import type { Service } from '@/types';
import { SubmitButton } from './Form';

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
  useEffect(() => {
    if (state.success && state.promo && !completed.current) {
      completed.current = true;
      onSaved(state.promo);
    }
  }, [state, onSaved]);
  const [values, setValues] = useState<Record<string, string>>(() => ({
    name: initial?.name ?? '',
    code: initial?.code ?? '',
    discountType: initial?.discountType ?? 'percentage',
    discountValue: String(initial?.discountValue ?? 25),
    maxDiscount:
      initial?.maxDiscount == null ? '' : String(initial.maxDiscount),
    minPurchase: String(initial?.minPurchase ?? 0),
    scope: initial?.scope ?? 'all',
    startsOn: initial?.startsOn ?? today,
    endsOn:
      initial?.endsOn ??
      new Date(Date.parse(today) + 7 * 86400000).toISOString().slice(0, 10),
    usageLimit: initial?.usageLimit == null ? '' : String(initial.usageLimit),
    perCustomerLimit: String(initial?.perCustomerLimit ?? 1),
    active: String(initial?.active ?? true),
  }));
  const [selected, setSelected] = useState(initial?.serviceIds ?? []);
  const [query, setQuery] = useState('');
  const [exampleId, setExampleId] = useState('');
  function change(name: string, value: string) {
    setValues((current) => ({
      ...current,
      [name]: name === 'code' ? value.toUpperCase() : value,
      ...(name === 'discountType' ? { discountValue: '' } : {}),
    }));
  }
  const error = (name: string) =>
    state.errors?.[name] ? (
      <span className="field-error" id={baseId + '-' + name + '-error'}>
        {state.errors[name]}
      </span>
    ) : null;
  const input = (
    name: string,
    label: string,
    props: InputHTMLAttributes<HTMLInputElement> = {},
    hint?: string,
  ) => (
    <div className="promo-field">
      <label htmlFor={baseId + '-' + name}>{label}</label>
      <input
        {...props}
        id={baseId + '-' + name}
        name={name}
        value={values[name]}
        onChange={(event) => change(name, event.target.value)}
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
        <small className="field-hint" id={baseId + '-' + name + '-hint'}>
          {hint}
        </small>
      )}
      {error(name)}
    </div>
  );
  const choices = services.filter(
    (service) => values.scope === 'all' || selected.includes(service.id),
  );
  const example =
    choices.find((service) => service.id === exampleId) ??
    choices.find((service) => service.active) ??
    choices[0];
  const quote = example
    ? quotePromo(
        {
          discountType: values.discountType as 'percentage' | 'fixed',
          discountValue: Number(values.discountValue),
          maxDiscount: values.maxDiscount ? Number(values.maxDiscount) : null,
          minPurchase: Number(values.minPurchase),
          stackable: false,
        },
        example,
      )
    : null;
  const found = services.filter((service) =>
    (service.name + ' ' + service.category)
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
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
  ];
  return (
    <form action={action} className="next-form promo-form">
      <div className="modal-body manage-form">
        <div className="promo-form-grid">
          <section
            className="promo-form-column"
            aria-labelledby={baseId + '-detail'}
          >
            <h3 id={baseId + '-detail'}>Detail promo</h3>
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
            <div className="promo-field-pair">
              <div className="promo-field">
                <label htmlFor={baseId + '-type'}>Jenis diskon</label>
                <select
                  id={baseId + '-type'}
                  name="discountType"
                  value={values.discountType}
                  onChange={(event) =>
                    change('discountType', event.target.value)
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
                values.discountType === 'percentage'
                  ? 'Diskon (%)'
                  : 'Potongan (Rp)',
                {
                  type: 'number',
                  required: true,
                  min: 1,
                  max: values.discountType === 'percentage' ? 100 : undefined,
                  step: 1,
                },
              )}
            </div>
            <div
              className={
                'promo-field-pair' +
                (values.discountType === 'fixed' ? ' single' : '')
              }
            >
              {values.discountType === 'percentage' &&
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
            <h3>Periode & batas pemakaian</h3>
            <div className="promo-field-pair">
              {input('startsOn', 'Mulai berlaku', {
                type: 'date',
                required: true,
              })}
              {input('endsOn', 'Berlaku sampai', {
                type: 'date',
                required: true,
                min: values.startsOn,
              })}
            </div>
            <p className="field-hint">
              Berlaku sampai akhir tanggal yang dipilih, waktu Indonesia Barat.
            </p>
            <div className="promo-field-pair">
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
            <input type="hidden" name="active" value={values.active} />
            <label className="promo-option promo-active">
              <input
                type="checkbox"
                checked={values.active === 'true'}
                onChange={(event) =>
                  change('active', String(event.target.checked))
                }
              />
              <span>
                <strong>Promo aktif</strong>
                <small>
                  Dapat digunakan selama periode dan kuota masih berlaku.
                </small>
              </span>
            </label>
            {error('active')}
          </section>
          <section
            className="promo-form-column"
            aria-labelledby={baseId + '-services'}
          >
            <h3 id={baseId + '-services'}>Layanan yang mendapat promo</h3>
            <fieldset className="promo-scope">
              <legend className="sr-only">Cakupan layanan</legend>
              <div className="promo-scope-options">
                <label className={values.scope === 'all' ? 'selected' : ''}>
                  <input
                    type="radio"
                    name="scope"
                    value="all"
                    checked={values.scope === 'all'}
                    onChange={() => change('scope', 'all')}
                  />
                  <span>
                    <strong>Semua layanan</strong>
                    <small>Termasuk layanan yang ditambahkan nanti.</small>
                  </span>
                </label>
                <label
                  className={values.scope === 'services' ? 'selected' : ''}
                >
                  <input
                    type="radio"
                    name="scope"
                    value="services"
                    checked={values.scope === 'services'}
                    onChange={() => change('scope', 'services')}
                  />
                  <span>
                    <strong>Pilih layanan</strong>
                    <small>Pilih satu atau beberapa layanan.</small>
                  </span>
                </label>
              </div>
              {error('scope')}
            </fieldset>
            {values.scope === 'services' && (
              <div className="promo-selection">
                <label className="sr-only" htmlFor={baseId + '-search'}>
                  Cari layanan untuk promo
                </label>
                <input
                  id={baseId + '-search'}
                  type="search"
                  placeholder="Cari nama atau kategori layanan…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <div className="promo-selection-heading">
                  <small>{selected.length} layanan dipilih</small>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setSelected([])}
                    disabled={!selected.length}
                  >
                    Bersihkan pilihan
                  </button>
                </div>
                <div className="promo-service-options">
                  {found.map((service) => (
                    <label key={service.id}>
                      <input
                        type="checkbox"
                        checked={selected.includes(service.id)}
                        onChange={(event) =>
                          setSelected((current) =>
                            event.target.checked
                              ? [...current, service.id]
                              : current.filter((id) => id !== service.id),
                          )
                        }
                      />
                      <span>
                        <strong>{service.name}</strong>
                        <small>
                          {service.category} · {rupiah(service.price)}
                          {!service.active ? ' · Nonaktif' : ''}
                        </small>
                      </span>
                    </label>
                  ))}
                  {!found.length && (
                    <p className="muted">Tidak ada layanan yang sesuai.</p>
                  )}
                </div>
                {selected.map((id) => (
                  <input type="hidden" name="serviceIds" key={id} value={id} />
                ))}
              </div>
            )}
            {error('serviceIds')}
            <input type="hidden" name="stackable" value="false" />
            <div className="promo-preview">
              <h4>Preview harga layanan</h4>
              {example && quote ? (
                <>
                  <label className="sr-only" htmlFor={baseId + '-example'}>
                    Pilih layanan untuk preview harga
                  </label>
                  <select
                    id={baseId + '-example'}
                    value={example.id}
                    onChange={(event) => setExampleId(event.target.value)}
                  >
                    {choices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                  <dl>
                    <div>
                      <dt>Harga layanan</dt>
                      <dd>{rupiah(quote.price)}</dd>
                    </div>
                    <div>
                      <dt>Potongan kode</dt>
                      <dd>−{rupiah(quote.discount)}</dd>
                    </div>
                    <div className="promo-preview-total">
                      <dt>Harga setelah diskon promo</dt>
                      <dd>{rupiah(quote.total)}</dd>
                    </div>
                  </dl>
                  {quote.reason && <p className="field-hint">{quote.reason}</p>}
                </>
              ) : (
                <p>Pilih layanan untuk melihat harga setelah diskon.</p>
              )}
              <small>Belum termasuk biaya tambahan saat checkout.</small>
            </div>
          </section>
        </div>
        {state.message && (
          <p className="form-error" role="alert">
            {state.message}
          </p>
        )}
        {Object.entries(state.errors ?? {})
          .filter(([name]) => !knownFields.includes(name))
          .map(([name, message]) => (
            <p key={name} className="field-error" role="alert">
              {message}
            </p>
          ))}
      </div>
      <div className="modal-footer">
        <button type="button" className="button" onClick={onCancel}>
          Batal
        </button>
        <SubmitButton>Simpan promo</SubmitButton>
      </div>
    </form>
  );
}
