'use client';
import {
  useActionState,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { addCategory, removeCategory } from '@/app/category-actions';
import type { Category } from '@/types';
import { DialogTrigger, useDialogClose } from './DialogTrigger';
import { SubmitButton } from './Form';

function CategoryForm({ resource }: { resource: Category['resource'] }) {
  const [state, action] = useActionState(addCategory.bind(null, resource), {});
  const id = useId();
  const close = useDialogClose();
  const router = useRouter();
  useEffect(() => {
    if (state.success) {
      router.refresh();
      close?.();
    }
  }, [state.success, router, close]);
  return (
    <form action={action} className="next-form">
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
              defaultValue={(state.values?.name as string) ?? ''}
              aria-invalid={!!state.errors?.name}
              aria-describedby={state.errors?.name ? id + '-error' : undefined}
            />
            {state.errors?.name && (
              <span className="field-error" id={id + '-error'}>
                {state.errors.name}
              </span>
            )}
          </div>
        </div>
        <p className="category-help">
          Kategori baru akan tersedia pada filter dan form{' '}
          {resource === 'services' ? 'layanan' : 'FAQ'}.
        </p>
        {state.message && (
          <p className="form-error" role="alert">
            {state.message}
          </p>
        )}
      </div>
      <div className="modal-footer">
        <button type="button" className="button" onClick={close ?? undefined}>
          Batal
        </button>
        <SubmitButton>Simpan kategori</SubmitButton>
      </div>
    </form>
  );
}

type ManagedCategory = Category & { serviceCount: number };

function DeleteCategoryForm({ categories }: { categories: ManagedCategory[] }) {
  const [state, action, pending] = useActionState(removeCategory, {});
  const [selectedId, setSelectedId] = useState('');
  const [deleteServices, setDeleteServices] = useState(false);
  const selected = categories.find((category) => category.id === selectedId);
  const id = useId();
  const close = useDialogClose();
  const router = useRouter();
  useEffect(() => {
    if (!state.success) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('tab') === state.values?.name) {
      url.searchParams.delete('tab');
      url.searchParams.delete('page');
      router.replace(url.pathname + url.search, { scroll: false });
    }
    router.refresh();
    close?.();
  }, [state.success, state.values?.name, router, close]);
  return (
    <form action={action} className="next-form">
      <div className="modal-body manage-form">
        <div className="form-grid">
          <div className="full-width">
            <label htmlFor={id}>Kategori layanan</label>
            <select
              id={id}
              name="categoryId"
              required
              value={selectedId}
              disabled={pending}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setDeleteServices(false);
              }}
              aria-describedby={id + '-help'}
            >
              <option value="">Pilih kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.serviceCount} layanan)
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="category-help" id={id + '-help'}>
          {!categories.length
            ? 'Belum ada kategori yang dapat dihapus.'
            : selected?.serviceCount
              ? deleteServices
                ? `Kategori “${selected.name}” beserta seluruh ${selected.serviceCount} layanannya akan dihapus, termasuk layanan nonaktif. Tindakan ini tidak dapat dibatalkan.`
                : `Kategori ini berisi ${selected.serviceCount} layanan. Centang pilihan di bawah untuk menghapus kategori beserta seluruh layanannya, atau pindahkan layanan ke kategori lain terlebih dahulu.`
              : selected
                ? `Hapus kategori “${selected.name}”? Kategori akan dihapus dari filter dan form layanan. Tindakan ini tidak dapat dibatalkan.`
                : 'Pilih kategori untuk melihat penggunaannya sebelum menghapus.'}
        </p>
        <label
          className="category-delete-services"
          data-disabled={!selected?.serviceCount || undefined}
        >
          <input
            type="checkbox"
            name="deleteServices"
            checked={deleteServices}
            disabled={pending || !selected?.serviceCount}
            onChange={(event) => setDeleteServices(event.target.checked)}
            aria-describedby={id + '-help'}
          />
          <span>
            <strong>Hapus semua layanan dalam kategori ini</strong>
            <small>
              {selected?.serviceCount
                ? `${selected.serviceCount} layanan, termasuk yang nonaktif, ikut dihapus.`
                : selected
                  ? 'Kategori ini sudah kosong. Tidak ada layanan yang perlu dihapus.'
                  : 'Pilih kategori terlebih dahulu.'}
            </small>
          </span>
        </label>
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
          onClick={close ?? undefined}
          disabled={pending}
        >
          Batal
        </button>
        <SubmitButton
          className="button destructive"
          pendingLabel="Menghapus…"
          disabled={!selected || (selected.serviceCount > 0 && !deleteServices)}
        >
          {deleteServices ? 'Hapus kategori & layanan' : 'Hapus kategori'}
        </SubmitButton>
      </div>
    </form>
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
            label="Hapus kategori"
            title="Hapus Kategori Layanan"
            icon="trash"
            dialogClass="compact-dialog"
            className="button"
          >
            <DeleteCategoryForm categories={categories} />
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
