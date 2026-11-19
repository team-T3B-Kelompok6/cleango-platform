'use client';
import { useActionState, useState, type ReactNode } from 'react';
import type { FormState } from '@/types';
import { Button } from './Button';
import { DialogBody } from './DialogBody';
import { DialogFooter } from './DialogFooter';
import { IconButton } from './IconButton';
import { Modal } from './Modal';
import { UiIcon } from './UiIcon';

/**
 * Tombol ikon + dialog konfirmasi untuk aksi merusak (hapus).
 * `action` adalah server action; kegagalan ditampilkan di dalam dialog.
 */
export function ConfirmDialog({
  label,
  title,
  subtitle,
  message,
  confirmLabel = 'Hapus data',
  pendingLabel = 'Menghapus…',
  action,
}: {
  /** Nama aksesibel tombol ikon, mis. "Hapus Pesanan". */
  label: string;
  title: string;
  subtitle?: string;
  message: ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
  action: (previous: FormState, form: FormData) => Promise<FormState>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, {});
  return (
    <>
      <IconButton
        label={label}
        className="size-36 rounded-sm border border-line text-danger hover:bg-danger-soft hover:text-danger"
        onClick={() => setOpen(true)}
      >
        <UiIcon name="trash" />
      </IconButton>
      {open && (
        <Modal
          title={title}
          subtitle={subtitle}
          icon="trash"
          iconTone="danger"
          width={480}
          onClose={() => setOpen(false)}
        >
          <form action={formAction} className="flex min-h-0 flex-1 flex-col">
            <DialogBody>
              <p>{message}</p>
              <p className="mt-8 text-sm text-ink-muted">
                Pastikan data sudah tidak diperlukan sebelum menghapusnya.
              </p>
              {state.message && (
                <p
                  role="alert"
                  className="mt-16 rounded-control bg-danger-soft p-10 text-sm leading-[1.6] text-danger"
                >
                  {state.message}
                </p>
              )}
            </DialogBody>
            <DialogFooter className="items-center justify-start">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                variant="danger"
                pendingLabel={pendingLabel}
              >
                {confirmLabel}
              </Button>
            </DialogFooter>
          </form>
        </Modal>
      )}
    </>
  );
}
