'use client';
import { useActionState, useEffect, useId, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { addCategory, updateCategory } from '@/app/category-actions';
import type { Category } from '@/types';
import {
  DialogBody,
  DialogFooter,
  Button,
  SubmitButton,
} from '@/components/shared/ui';
import { useDialogClose } from '@/components/shared/ui/DialogTrigger';
import { useCategoryForm } from '@/hooks/useCategoryForm';
import { categoryFormHelp } from '@/lib/category-form';
import { CategoryIconUpload } from './CategoryIconUpload';
import { CategoryDeleteForm } from './CategoryDeleteForm';
import {
  errorClass,
  helpClass,
  inputClass,
  labelClass,
  noticeClass,
  type ManagedCategory,
} from './data';

/** Form tambah/ubah kategori layanan atau FAQ. */
export function CategoryForm({
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
  const id = useId();
  const close = useDialogClose();
  const router = useRouter();
  const successHandled = useRef(false);
  const form = useCategoryForm({
    name: category?.name,
    iconSrc: category?.iconSrc,
  });

  useEffect(() => {
    onBusy?.(pending);
  }, [pending, onBusy]);

  useEffect(() => {
    if (!state.success || successHandled.current) return;
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
  }, [state.success, state.values, category, router, close]);

  if (category && form.deleting)
    return (
      <CategoryDeleteForm
        category={category}
        onCancel={() => form.setDeleting(false)}
        onBusy={onBusy}
      />
    );

  return (
    <form
      action={(data) => {
        if (category) {
          data.set('categoryId', category.id);
          data.set('removeCategoryIcon', String(form.iconRemoved));
        }
        if (resource === 'services' && form.iconFile)
          data.set('categoryIcon', form.iconFile);
        action(data);
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <DialogBody className="flex flex-col gap-16">
        <div>
          <label htmlFor={id} className={labelClass}>
            Nama kategori
          </label>
          <input
            id={id}
            name="name"
            className={inputClass}
            required
            maxLength={60}
            placeholder={
              resource === 'services'
                ? 'Contoh: Perawatan taman'
                : 'Contoh: Akun pelanggan'
            }
            value={form.name}
            onChange={(event) => form.setName(event.target.value)}
            disabled={pending}
            aria-invalid={!!state.errors?.name}
            aria-describedby={state.errors?.name ? id + '-error' : undefined}
          />
          {state.errors?.name && (
            <span className={errorClass} id={id + '-error'}>
              {state.errors.name}
            </span>
          )}
        </div>
        {resource === 'services' && (
          <CategoryIconUpload
            id={id}
            preview={form.iconPreview}
            error={form.iconError || String(state.errors?.categoryIcon ?? '')}
            pending={pending}
            inputRef={form.iconInput}
            onSelect={form.selectIcon}
            onRemove={form.removeIcon}
          />
        )}
        <p className={helpClass}>
          {categoryFormHelp({
            serviceCount: category?.serviceCount ?? 0,
            resource: resource === 'services' ? 'services' : 'faq',
            editing: !!category,
          })}
        </p>
        {state.message && (
          <p className={noticeClass} role="alert">
            {state.message}
          </p>
        )}
      </DialogBody>
      <DialogFooter className="items-center">
        {category && (
          <Button
            variant="ghost"
            className="mr-auto border-transparent bg-transparent text-danger hover:bg-danger-soft"
            disabled={pending}
            onClick={() => form.setDeleting(true)}
          >
            Hapus kategori
          </Button>
        )}
        <Button variant="ghost" disabled={pending} onClick={close ?? undefined}>
          Batal
        </Button>
        <SubmitButton disabled={!!form.iconError}>
          {category ? 'Simpan perubahan' : 'Simpan kategori'}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
