import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Baris tab filter di atas daftar. */
export function Tabs({
  label,
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'flex min-h-42 items-center gap-5 overflow-x-auto rounded-md border border-line bg-surface p-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
