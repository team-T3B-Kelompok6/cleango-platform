'use client';
import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  addCategory,
  updateCategory,
  removeCategory,
} from '@/app/category-actions';
import type { Category } from '@/types';
import { DialogTrigger, useDialogClose } from './DialogTrigger';
import { SubmitButton } from './Form';
import Image from 'next/image';
import { UiIcon } from './UiIcon';

type ManagedCategory = Category & {
  serviceCount: number;
  iconSrc?: string | null;
};

function CategoryForm({
  resource,
  category,
  onBusy,
}: {
  resource: Category['resource'];
  category?: ManagedCategory;
  onBusy?: (busy: boolean) => void;
}) {
  const [state, action, pending] = useActionState(
    category ? updateCategory : addCategory.bind(null, resource),
    {},
  );
  const [name, setName] = useState(category?.name ?? '');
  const [deleting, setDeleting] = useState(false);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState(category?.iconSrc ?? '');
  const [iconRemoved, setIconRemoved] = useState(false);
  const [iconError, setIconError] = useState('');
  const iconInput = useRef<HTMLInputElement>(null);
  const successHandled = useRef(false);
  const id = useId();
  const close = useDialogClose();
  const router = useRouter();
  useEffect(() => {
    onBusy?.(pending);
  }, [pending, onBusy]);
  useEffect(() => {
    if (!iconFile) {
      setIconPreview(iconRemoved ? '' : (category?.iconSrc ?? ''));
      return;
    }
    const url = URL.createObjectURL(iconFile);
    setIconPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [iconFile, iconRemoved, category?.iconSrc]);
  useEffect(() => {
    if (state.success && !successHandled.current) {
      successHandled.current = true;
      if (category && state.values?.previousName && state.values.name) {
        const url = new URL(window.location.href);
        if (
          state.values.previousName !== state.values.name &&
          url.searchParams.get('tab') === state.values.previousName
        ) {
          url.searchParams.set('tab', String(state.values.name));
          url.searchParams.delete('page');
          router.replace(url.pathname + url.search, { scroll: false });
          close?.();
          return;
        }
      }
      router.refresh();
      close?.();
    }
  }, [state.success, state.values, category, router, close]);
  if (category && deleting)
    return (
      <DeleteCategoryForm
        category={category}
        onCancel={() => setDeleting(false)}
        onBusy={onBusy}
      />
    );
  return (
    <form
      action={(form) => {
        if (category) {
          form.set('categoryId', category.id);
          form.set('removeCategoryIcon', String(iconRemoved));
        }
        if (resource === 'services' && iconFile)
          form.set('categoryIcon', iconFile);
        action(form);
      }}
      className="next-form"
    >
      <div className="modal-body manage-form">
        <div className="form-grid">
          <div className="full-width">
            <label htmlFor={id}>Nama kategori</label>
            <input
              id={id}
              name="name"
              required
              maxLength={60}
              placeholder={
                resource === 'services'
                  ? 'Contoh: Perawatan taman'
                  : 'Contoh: Akun pelanggan'
              }
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={pending}
              aria-invalid={!!state.errors?.name}
              aria-describedby={state.errors?.name ? id + '-error' : undefined}
            />
            {state.errors?.name && (
              <span className="field-error" id={id + '-error'}>
                {state.errors.name}
              </span>
            )}
          </div>
          {resource === 'services' && (
            <div className="full-width category-icon-field">
              <label htmlFor={id + '-icon'}>Ikon kategori</label>
              <div className="category-icon-row">
                <span className="category-icon-preview">
                  {iconPreview ? (
                    <Image
                      src={iconPreview}
                      alt="Pratinjau ikon kategori"
                      width={64}
                      height={64}
                      unoptimized
                    />
                  ) : (
                    <UiIcon name="image" />
                  )}
                </span>
                <div>
                  <div className="category-icon-actions">
                    <button
                      type="button"
                      className="button"
                      disabled={pending}
                      onClick={() => iconInput.current?.click()}
                    >
                      {iconPreview ? 'Ganti ikon' : 'Unggah ikon'}
                    </button>
                    {(iconPreview || iconError) && (
                      <button
                        type="button"
                        className="button"
                        aria-label="Hapus ikon kategori"
                        disabled={pending}
                        onClick={() => {
                          setIconFile(null);
                          setIconRemoved(true);
                          setIconError('');
                          if (iconInput.current) iconInput.current.value = '';
                        }}
                      >
                        <UiIcon name="trash" />
                      </button>
                    )}
                  </div>
                  <small className="field-hint">
                    JPG, PNG, WebP · maks. 2 MB
                  </small>
                </div>
              </div>
              <input
                ref={iconInput}
                id={id + '-icon'}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="service-file-input"
                aria-label="Unggah ikon kategori"
                disabled={pending}
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (!selected) return;
                  if (
                    !selected.size ||
                    selected.size > 2 * 1024 * 1024 ||
                    !['image/jpeg', 'image/png', 'image/webp'].includes(
                      selected.type,
                    )
                  ) {
                    setIconError('Gunakan JPG, PNG, atau WebP, maksimal 2 MB.');
                    event.target.value = '';
                    return;
                  }
                  setIconError('');
                  setIconRemoved(false);
                  setIconFile(selected);
                }}
              />
              {(iconError || state.errors?.categoryIcon) && (
                <p className="field-error" role="alert">
                  {iconError || state.errors?.categoryIcon}
                </p>
              )}
            </div>
          )}
        </div>
        <p className="category-help">
          {category ? (
            `${category.serviceCount} layanan dalam kategori ini. Perubahan nama berlaku untuk layanan di dalamnya.`
          ) : (
            <>
              Kategori baru akan tersedia pada filter dan form{' '}
              {resource === 'services' ? 'layanan' : 'FAQ'}.
            </>
          )}
        </p>
        {state.message && (
          <p className="form-error" role="alert">
            {state.message}
          </p>
        )}
      </div>
      <div className="modal-footer category-editor-footer">
        {category && (
          <button
            type="button"
            className="button category-delete-action"
            disabled={pending}
            onClick={() => setDeleting(true)}
          >
            Hapus kategori
          </button>
        )}
        <button
          type="button"
          className="button"
          disabled={pending}
          onClick={close ?? undefined}
        >
          Batal
        </button>
        <SubmitButton disabled={!!iconError}>
          {category ? 'Simpan perubahan' : 'Simpan kategori'}
        </SubmitButton>
      </div>
    </form>
  );
}

function DeleteCategoryForm({
  category,
  onCancel,
  onBusy,
}: {
  category: ManagedCategory;
  onCancel: () => void;
  onBusy?: (busy: boolean) => void;
}) {
  const [state, action, pending] = useActionState(removeCategory, {});
  const [deleteServices, setDeleteServices] = useState(false);
  const id = useId();
  const close = useDialogClose();
  const router = useRouter();
  const successHandled = useRef(false);
  useEffect(() => {
    onBusy?.(pending);
  }, [pending, onBusy]);
  useEffect(() => {
    if (!state.success || successHandled.current) return;
    successHandled.current = true;
    const url = new URL(window.location.href);
    if (url.searchParams.get('tab') === state.values?.name) {
      url.searchParams.delete('tab');
      url.searchParams.delete('page');
      router.replace(url.pathname + url.search, { scroll: false });
      close?.();
      return;
    }
    router.refresh();
    close?.();
  }, [state.success, state.values?.name, router, close]);
  return (
    <form action={action} className="next-form">
      <input type="hidden" name="categoryId" value={category.id} />
      <div className="modal-body manage-form">
        <p>
          Hapus kategori <strong>“{category.name}”</strong>?
        </p>
        <p className="category-help" id={id + '-help'}>
          {category.serviceCount
            ? category.serviceCount +
              ' layanan masih menggunakan kategori ini. Pindahkan layanan terlebih dahulu, atau hapus seluruh layanannya bersama kategori.'
            : 'Kategori ini belum digunakan oleh layanan.'}{' '}
          Penghapusan tidak dapat dibatalkan.
        </p>
        {category.serviceCount > 0 && (
          <label className="category-delete-services">
            <input
              type="checkbox"
              name="deleteServices"
              checked={deleteServices}
              disabled={pending}
              onChange={(event) => setDeleteServices(event.target.checked)}
              aria-describedby={id + '-help'}
            />
            <span>
              <strong>Hapus semua layanan dalam kategori ini</strong>
              <small>
                {category.serviceCount} layanan, termasuk yang nonaktif, ikut
                dihapus.
              </small>
            </span>
          </label>
        )}
        {state.message && (
          <p className="form-error" role="alert">
            {state.message}
          </p>
        )}
      </div>
      <div className="modal-footer">
        <button
          type="button"
          className="button"
          onClick={onCancel}
          disabled={pending}
        >
          Batal
        </button>
        <SubmitButton
          className="button destructive"
          pendingLabel="Menghapus…"
          disabled={category.serviceCount > 0 && !deleteServices}
        >
          {deleteServices ? 'Hapus kategori & layanan' : 'Hapus kategori'}
        </SubmitButton>
      </div>
    </form>
  );
}

function ManageCategories({ categories }: { categories: ManagedCategory[] }) {
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);
  const id = useId();
  const close = useDialogClose();
  const selected = categories.find((category) => category.id === selectedId);
  return (
    <>
      <div className="category-selector manage-form">
        <div className="form-grid">
          <div className="full-width">
            <label htmlFor={id}>Pilih kategori</label>
            <select
              id={id}
              value={selectedId}
              disabled={busy || !categories.length}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              <option value="">Pilih kategori layanan</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.serviceCount} layanan)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {selected ? (
        <CategoryForm
          key={selected.id}
          resource="services"
          category={selected}
          onBusy={setBusy}
        />
      ) : (
        <>
          <div className="modal-body manage-form">
            <p className="category-help">
              {categories.length
                ? 'Pilih kategori untuk mengubah nama, ikon, atau menghapusnya.'
                : 'Belum ada kategori layanan.'}
            </p>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="button"
              onClick={close ?? undefined}
            >
              Tutup
            </button>
          </div>
        </>
      )}
    </>
  );
}

export function CategoryManager({
  resource,
  count,
  categories = [],
  children,
}: {
  resource: Category['resource'];
  count: number;
  categories?: ManagedCategory[];
  children?: ReactNode;
}) {
  return (
    <div className="category-manager">
      <span>
        {count} kategori {resource === 'services' ? 'layanan' : 'FAQ'}
      </span>
      <div className="category-manager-actions">
        {children}
        {resource === 'services' && (
          <DialogTrigger
            label="Kelola kategori"
            title="Kelola Kategori Layanan"
            icon="edit"
            dialogClass="compact-dialog"
            className="button"
          >
            <ManageCategories categories={categories} />
          </DialogTrigger>
        )}
        <DialogTrigger
          label="Tambah kategori"
          title={
            'Tambah Kategori ' + (resource === 'services' ? 'Layanan' : 'FAQ')
          }
          icon="plus"
          dialogClass="compact-dialog"
          className="button category-add"
        >
          <CategoryForm resource={resource} />
        </DialogTrigger>
      </div>
    </div>
  );
}
