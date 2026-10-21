'use client';

import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useDialogClose } from './DialogTrigger';
import { SubmitButton } from './Form';
import { UiIcon } from './UiIcon';
import type { FormState, RecordData } from '@/types';

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
  const fileInput = useRef<HTMLInputElement>(null);
  const nextFeature = useRef(1000);
  const [name, setName] = useState(String(initial.name ?? ''));
  const [category, setCategory] = useState(
    String(initial.category ?? categories[0] ?? ''),
  );
  const [duration, setDuration] = useState(String(initial.duration ?? ''));
  const [description, setDescription] = useState(
    String(initial.description ?? ''),
  );
  const [file, setFile] = useState<File | null>(null);
  const [removed, setRemoved] = useState(false);
  const [preview, setPreview] = useState(String(initial.imageUrl ?? ''));
  const [imageError, setImageError] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [price, setPrice] = useState(String(initial.price ?? ''));
  const [active, setActive] = useState(initial.active !== false);
  const [features, setFeatures] = useState(() =>
    (Array.isArray(initial.features) ? initial.features : []).map(
      (value, key) => ({ key, value: String(value) }),
    ),
  );
  useEffect(() => {
    setImageFailed(false);
    if (!file) {
      setPreview(removed ? '' : String(initial.imageUrl ?? ''));
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, removed, initial.imageUrl]);
  function selectFile(selected?: File) {
    if (!selected) return;
    if (
      !['image/jpeg', 'image/png'].includes(selected.type) ||
      selected.size > 2 * 1024 * 1024
    ) {
      setImageError('Gunakan JPG atau PNG, maksimal 2 MB.');
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    setImageError('');
    setFile(selected);
    setRemoved(false);
  }
  function field(name: string, label: string, input: ReactNode) {
    return (
      <div className="service-field">
        <label htmlFor={id + name}>{label}</label>
        {input}
        {state.errors?.[name] && (
          <span className="field-error" id={id + name + '-error'}>
            {state.errors[name]}
          </span>
        )}
      </div>
    );
  }
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
  return (
    <form
      className="next-form service-editor"
      action={(data) => {
        if (file) data.set('serviceImage', file);
        data.set('removeImage', String(removed));
        data.set(
          'features',
          features
            .map((feature) => feature.value.trim())
            .filter(Boolean)
            .join('\n'),
        );
        formAction(data);
      }}
    >
      <div className="modal-body manage-form">
        <div className="service-editor-grid">
          <section
            className="service-editor-column"
            aria-labelledby={id + 'details'}
          >
            <h3 className="service-section-label" id={id + 'details'}>
              Detail & foto layanan
            </h3>
            <div className="service-photo-box">
              <div className="service-section-heading">
                <strong>Foto utama layanan</strong>
                <small>JPG, PNG · maks. 2 MB</small>
              </div>
              <div className="service-photo-preview">
                {preview && !imageFailed ? (
                  <Image
                    src={preview}
                    alt="Pratinjau foto layanan"
                    width={800}
                    height={450}
                    unoptimized
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <div className="service-photo-empty">
                    <UiIcon name="plus" />
                    <span>
                      {imageFailed
                        ? 'Foto tidak dapat dimuat. Pilih foto lain.'
                        : 'Tambahkan foto layanan'}
                    </span>
                  </div>
                )}
                {!!preview && (
                  <div className="service-photo-toolbar">
                    <span>{file ? 'Foto baru dipilih' : 'Foto saat ini'}</span>
                    <button
                      className="button"
                      type="button"
                      disabled={pending}
                      onClick={() => fileInput.current?.click()}
                    >
                      Ganti
                    </button>
                    <button
                      className="button"
                      type="button"
                      aria-label="Hapus foto layanan"
                      disabled={pending}
                      onClick={() => {
                        setFile(null);
                        setRemoved(true);
                        setImageError('');
                        if (fileInput.current) fileInput.current.value = '';
                      }}
                    >
                      <UiIcon name="trash" />
                    </button>
                  </div>
                )}
              </div>
              <button
                className={'service-photo-drop' + (dragging ? ' dragging' : '')}
                type="button"
                disabled={pending}
                onClick={() => fileInput.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  if (!pending) selectFile(event.dataTransfer.files[0]);
                }}
              >
                <UiIcon name="plus" />
                Tarik foto ke sini atau unggah foto
              </button>
              <input
                ref={fileInput}
                id={id + 'image'}
                type="file"
                accept="image/jpeg,image/png"
                className="service-file-input"
                aria-label="Unggah foto layanan"
                onChange={(event) => selectFile(event.target.files?.[0])}
              />
              {(imageError || state.errors?.serviceImage) && (
                <p className="field-error" role="alert">
                  {imageError || state.errors?.serviceImage}
                </p>
              )}
            </div>
            <div className="service-fields-pair">
              {field(
                'name',
                'Nama layanan',
                <input
                  {...props('name')}
                  required
                  maxLength={120}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Contoh: Deep Cleaning"
                />,
              )}
              {field(
                'category',
                'Kategori layanan',
                <select
                  {...props('category')}
                  required
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
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
            <div className="service-fields-pair">
              {field(
                'price',
                'Harga normal (Rp)',
                <input
                  {...props('price')}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  required
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="350000"
                />,
              )}
              {field(
                'duration',
                'Estimasi durasi pengerjaan',
                <input
                  {...props('duration')}
                  required
                  maxLength={80}
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  placeholder="Contoh: 3–4 jam"
                />,
              )}
            </div>
            <p className="field-hint">
              Diskon layanan diatur melalui Kelola Promo.
            </p>
          </section>
          <section
            className="service-editor-column"
            aria-labelledby={id + 'description-heading'}
          >
            <h3
              className="service-section-label"
              id={id + 'description-heading'}
            >
              Deskripsi & fasilitas
            </h3>
            {field(
              'description',
              'Deskripsi pengerjaan layanan',
              <textarea
                {...props('description')}
                required
                rows={4}
                maxLength={3000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Jelaskan area dan pekerjaan yang termasuk dalam layanan."
              />,
            )}
            <div className="service-facilities">
              <div className="service-section-heading">
                <h4>Fasilitas untuk pelanggan</h4>
                <small>
                  {features.filter((feature) => feature.value.trim()).length}{' '}
                  fasilitas
                </small>
              </div>
              <div className="service-feature-rows">
                {features.map((feature, index) => (
                  <div className="service-feature-row" key={feature.key}>
                    <UiIcon name="tick" />
                    <input
                      aria-label={'Fasilitas ' + (index + 1)}
                      value={feature.value}
                      maxLength={180}
                      placeholder="Contoh: Peralatan & cairan pembersih"
                      onChange={(event) =>
                        setFeatures((items) =>
                          items.map((item) =>
                            item.key === feature.key
                              ? { ...item, value: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={'Hapus fasilitas ' + (index + 1)}
                      onClick={() =>
                        setFeatures((items) =>
                          items.filter((item) => item.key !== feature.key),
                        )
                      }
                    >
                      <UiIcon name="close" />
                    </button>
                  </div>
                ))}
              </div>
              {!features.length && (
                <p className="service-facilities-empty">
                  Belum ada fasilitas. Cantumkan apa saja yang pelanggan
                  dapatkan.
                </p>
              )}
              <button
                type="button"
                className="service-add-feature"
                disabled={features.length >= 15}
                onClick={() => {
                  const key = nextFeature.current++;
                  setFeatures((items) => [...items, { key, value: '' }]);
                }}
              >
                <UiIcon name="plus" />
                Tambah fasilitas layanan
              </button>
              {state.errors?.features && (
                <p className="field-error">{state.errors.features}</p>
              )}
            </div>
            <label className="service-status" htmlFor={id + 'active'}>
              <span>
                <strong>{active ? 'Layanan aktif' : 'Layanan nonaktif'}</strong>
                <small>
                  {active
                    ? 'Ditampilkan dan dapat dipesan di aplikasi.'
                    : 'Disembunyikan dari pilihan layanan di aplikasi.'}
                </small>
              </span>
              <input
                id={id + 'active'}
                type="checkbox"
                role="switch"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
              <span className="service-switch-track" aria-hidden="true" />
            </label>
            <input type="hidden" name="active" value={String(active)} />
          </section>
        </div>
        {state.message && (
          <p className="form-error" role="alert">
            {state.message}
          </p>
        )}
        {Object.entries(state.errors ?? {})
          .filter(
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
          )
          .map(([name, message]) => (
            <p key={name} className="field-error" role="alert">
              {message}
            </p>
          ))}
        {!!Object.keys(state.errors ?? {}).length && (
          <p className="field-error" role="alert">
            Periksa kembali kolom yang ditandai sebelum menyimpan.
          </p>
        )}
      </div>
      <div className="modal-footer service-editor-footer">
        <span className="muted">
          {initial.id ? '#' + initial.id : 'Layanan baru'} ·{' '}
          {active ? 'Aktif' : 'Nonaktif'}
        </span>
        {close ? (
          <button type="button" className="button" onClick={close}>
            Batal
          </button>
        ) : (
          <Link className="button" href="/layanan">
            Batal
          </Link>
        )}
        <SubmitButton disabled={!!imageError}>
          {initial.id ? 'Simpan perubahan' : 'Simpan layanan'}
        </SubmitButton>
      </div>
    </form>
  );
}
