import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function DialogFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'modal-footer flex shrink-0 flex-wrap justify-end gap-10 border-t border-line-soft bg-surface px-26 py-18',
        className,
      )}
    >
      {children}
    </div>
  );
}
