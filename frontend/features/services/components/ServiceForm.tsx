'use client';
import { useActionState, useId, type ReactNode } from 'react';
import Link from 'next/link';
import {
  DialogBody,
  DialogFooter,
  Button,
  buttonVariants,
  SubmitButton,
} from '@/components/ui';
import { useDialogClose } from '@/components/ui/DialogTrigger';
import { filledFeatureCount } from '../data/serviceFormRules';
import { useServiceForm } from '../hooks/useServiceForm';
import type { FormState, RecordData } from '@/types';
import { ServiceFeatures } from './ServiceFeatures';
import { ServicePhotoField } from './ServicePhotoField';
import {
  columnClass,
  errorClass,
  fieldClass,
  hintClass,
  inputClass,
  labelClass,
  pairClass,
  sectionLabelClass,
} from '../data/serviceStyles';

/** Form tambah/ubah layanan: dua kolom (detail+foto, deskripsi+fasilitas). */
export function ServiceForm({
  initial = {},
  categories,
  action,
}: {
  initial?: Partial<RecordData>;
  categories: string[];
  action: (state: FormState, form: FormData) => Promise<FormState>;
  focusPromo?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const close = useDialogClose();
  const id = useId();
  const form = useServiceForm({ initial, categories });

  function props(name: string) {
    return {
      id: id + name,
      name,
      'aria-invalid': !!state.errors?.[name],
      'aria-describedby': state.errors?.[name]
        ? id + name + '-error'
        : undefined,
    };
  }

  function field(name: string, label: string, input: ReactNode) {
    return (
      <div className={fieldClass}>
        <label htmlFor={id + name} className={labelClass}>
          {label}
        </label>
        {input}
        {state.errors?.[name] && (
          <span className={errorClass} id={id + name + '-error'}>
            {state.errors[name]}
          </span>
        )}
      </div>
    );
  }

  const otherErrors = Object.entries(state.errors ?? {}).filter(
    ([name]) =>
      ![
        'name',
        'category',
        'duration',
        'price',
        'description',
        'features',
        'serviceImage',
      ].includes(name),
  );

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      action={(data) => {
        if (form.file) data.set('serviceImage', form.file);
        data.set('removeImage', String(form.removed));
        data.set('features', form.featurePayload());
        formAction(data);
      }}
    >
      <DialogBody className="flex flex-col gap-18">
        <div className="grid grid-cols-2 gap-20 max-md:grid-cols-1">
          <section className={columnClass} aria-labelledby={id + 'details'}>
            <h3 className={sectionLabelClass} id={id + 'details'}>
              Detail & foto layanan
            </h3>
            <ServicePhotoField
              preview={form.preview}
              hasFile={!!form.file}
              imageFailed={form.imageFailed}
              dragging={form.dragging}
              pending={pending}
              error={
                form.imageError || String(state.errors?.serviceImage ?? '')
              }
              inputRef={form.fileInput}
              onSelect={form.selectFile}
              onRemove={form.removeImage}
              onImageError={() => form.setImageFailed(true)}
              onDragState={form.setDragging}
            />
            <div className={pairClass}>
              {field(
                'name',
                'Nama layanan',
                <input
                  {...props('name')}
                  className={inputClass}
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(event) => form.setName(event.target.value)}
                  placeholder="Contoh: Deep Cleaning"
                />,
              )}
              {field(
                'category',
                'Kategori layanan',
                <select
                  {...props('category')}
                  className={inputClass}
                  required
                  value={form.category}
                  onChange={(event) => form.setCategory(event.target.value)}
                >
                  {!categories.length && (
                    <option value="">Tambahkan kategori terlebih dahulu</option>
                  )}
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>,
              )}
            </div>
            <div className={pairClass}>
              {field(
                'price',
                'Harga normal (Rp)',
                <input
                  {...props('price')}
                  className={inputClass}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  required
                  value={form.price}
                  onChange={(event) => form.setPrice(event.target.value)}
                  placeholder="350000"
                />,
              )}
              {field(
                'duration',
                'Estimasi durasi pengerjaan',
                <input
                  {...props('duration')}
                  className={inputClass}
                  required
                  maxLength={80}
                  value={form.duration}
                  onChange={(event) => form.setDuration(event.target.value)}
                  placeholder="Contoh: 3–4 jam"
                />,
              )}
            </div>
            <p className={hintClass}>
              Diskon layanan diatur melalui Kelola Promo.
            </p>
          </section>

          <section
            className={columnClass}
            aria-labelledby={id + 'description-heading'}
          >
            <h3 className={sectionLabelClass} id={id + 'description-heading'}>
              Deskripsi & fasilitas
            </h3>
            {field(
              'description',
              'Deskripsi pengerjaan layanan',
              <textarea
                {...props('description')}
                className={inputClass}
                required
                rows={4}
                maxLength={3000}
                value={form.description}
                onChange={(event) => form.setDescription(event.target.value)}
                placeholder="Jelaskan area dan pekerjaan yang termasuk dalam layanan."
              />,
            )}
            <ServiceFeatures
              features={form.features}
              filled={filledFeatureCount(form.features)}
              error={state.errors?.features}
              pending={pending}
              onAdd={form.addFeature}
              onChange={form.setFeature}
              onRemove={form.removeFeature}
            />
            <label
              className="flex items-center justify-between gap-12 rounded-card border border-line p-12"
              htmlFor={id + 'active'}
            >
              <span>
                <strong className="block text-sm font-semibold text-ink">
                  {form.active ? 'Layanan aktif' : 'Layanan nonaktif'}
                </strong>
                <small className={hintClass}>
                  {form.active
                    ? 'Ditampilkan dan dapat dipesan di aplikasi.'
                    : 'Disembunyikan dari pilihan layanan di aplikasi.'}
                </small>
              </span>
              <input
                id={id + 'active'}
                type="checkbox"
                role="switch"
                className="peer sr-only"
                checked={form.active}
                onChange={(event) => form.setActive(event.target.checked)}
              />
              <span
                aria-hidden="true"
                className="relative h-24 w-44 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-accent after:absolute after:top-3 after:left-3 after:size-18 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-20"
              />
            </label>
            <input type="hidden" name="active" value={String(form.active)} />
          </section>
        </div>
        {state.message && (
          <p
            role="alert"
            className="rounded-control bg-danger-soft p-10 text-sm leading-[1.6] text-danger"
          >
            {state.message}
          </p>
        )}
        {otherErrors.map(([name, message]) => (
          <p key={name} className={errorClass} role="alert">
            {message}
          </p>
        ))}
        {!!Object.keys(state.errors ?? {}).length && (
          <p className={errorClass} role="alert">
            Periksa kembali kolom yang ditandai sebelum menyimpan.
          </p>
        )}
      </DialogBody>
      <DialogFooter className="items-center">
        <span className="mr-auto text-xs text-ink-muted">
          {initial.id ? '#' + initial.id : 'Layanan baru'} ·{' '}
          {form.active ? 'Aktif' : 'Nonaktif'}
        </span>
        {close ? (
          <Button variant="ghost" onClick={close}>
            Batal
          </Button>
        ) : (
          <Link
            className={buttonVariants({ variant: 'ghost' })}
            href="/layanan"
          >
            Batal
          </Link>
        )}
        <SubmitButton disabled={!!form.imageError}>
          {initial.id ? 'Simpan perubahan' : 'Simpan layanan'}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
