'use client';
import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { removeCategory } from '@/app/category-actions';
import {
  Button,
  DialogBody,
  DialogFooter,
  SubmitButton,
} from '@/components/shared/ui';
import { useDialogClose } from '@/components/shared/ui/DialogTrigger';
import {
  categoryDeleteLabel,
  categoryDeleteMessage,
} from '@/lib/category-form';
import { noticeClass, type ManagedCategory } from './data';

/** Konfirmasi hapus kategori, termasuk opsi menghapus seluruh layanannya. */
export function CategoryDeleteForm({
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
    <form action={action} className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="categoryId" value={category.id} />
      <DialogBody className="flex flex-col gap-16">
        <p className="text-base leading-[1.6] text-ink">
          {categoryDeleteMessage({
            name: category.name,
            serviceCount: category.serviceCount,
          })}
        </p>
        {category.serviceCount > 0 && (
          <label className="flex cursor-pointer items-start gap-12 rounded-md border border-line p-14">
            <input
              type="checkbox"
              name="deleteServices"
              className="mt-1 size-[18px] shrink-0 accent-danger"
              checked={deleteServices}
              disabled={pending}
              onChange={(event) => setDeleteServices(event.target.checked)}
              aria-describedby={id + '-help'}
            />
            <span className="grid min-w-0 gap-6">
              <strong className="text-base leading-[1.5] text-ink">
                Hapus semua layanan dalam kategori ini
              </strong>
              <small className="text-xs leading-[1.6] text-ink-muted">
                {category.serviceCount} layanan, termasuk yang nonaktif, ikut
                dihapus.
              </small>
            </span>
          </label>
        )}
        <p className="text-base leading-[1.6] text-ink-muted">
          {deleteServices
            ? 'Layanan di dalam kategori ini akan dihapus bersama kategori.'
            : 'Pindahkan layanan ke kategori lain bila masih ingin menyimpannya.'}
        </p>
        {state.message && (
          <p className={noticeClass} role="alert">
            {state.message}
          </p>
        )}
      </DialogBody>
      <DialogFooter className="items-center">
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          Batal
        </Button>
        <SubmitButton
          className="inline-flex min-h-40 items-center justify-center rounded-md border border-danger bg-danger px-14 py-8 text-base font-bold whitespace-nowrap text-white transition-colors enabled:hover:brightness-95 disabled:opacity-45"
          pendingLabel="Menghapus…"
          disabled={category.serviceCount > 0 && !deleteServices}
        >
          {categoryDeleteLabel(deleteServices)}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
