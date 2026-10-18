'use client';
import { useActionState, useEffect, useId, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { addCategory } from '@/app/category-actions';
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

export function CategoryManager({
  resource,
  count,
  children,
}: {
  resource: Category['resource'];
  count: number;
  children?: ReactNode;
}) {
  return (
    <div className="category-manager">
      <span>
        {count} kategori {resource === 'services' ? 'layanan' : 'FAQ'}
      </span>
      <div className="category-manager-actions">
        {children}
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
