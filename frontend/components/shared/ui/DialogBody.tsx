import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function DialogBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'modal-body min-h-0 overflow-y-auto px-26 py-18 leading-[1.7]',
        className,
      )}
    >
      {children}
    </div>
  );
}
