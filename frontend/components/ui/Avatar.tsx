import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Avatar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-[34px] shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent',
        className,
      )}
    >
      {children}
    </span>
  );
}
