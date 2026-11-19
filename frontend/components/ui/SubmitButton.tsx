'use client';
import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';
import { buttonVariants } from './buttonVariants';

/** Tombol submit dengan label "Menyimpan…" otomatis saat pending. */
export function SubmitButton({
  children,
  pendingLabel = 'Menyimpan…',
  className,
  disabled = false,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className ?? buttonVariants({ variant: 'primary' })}
      type="submit"
      disabled={pending || disabled}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
