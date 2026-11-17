import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Grid kartu metrik: 3 kolom (default) atau 4 kolom di dashboard. */
export function MetricGrid({
  columns = 3,
  className,
  children,
}: {
  columns?: 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid gap-12 max-md:grid-cols-2 max-sm:grid-cols-1',
        columns === 4
          ? 'grid-cols-4'
          : columns === 2
            ? 'grid-cols-2'
            : 'grid-cols-3',
        className,
      )}
    >
      {children}
    </div>
  );
}
