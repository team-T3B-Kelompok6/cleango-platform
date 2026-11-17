import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function PageHeader({
  title,
  description,
  actions,
  align = 'center',
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  align?: 'start' | 'center';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap justify-between gap-20',
        align === 'center' ? 'items-center' : 'items-start',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="font-display text-3xl leading-[1.3] font-bold tracking-[-0.02em] text-ink">
          {title}
        </h1>
        {description && (
          <p className="mt-6 max-w-[70ch] text-base leading-[1.6] text-ink-muted">
            {description}
          </p>
        )}
      </div>
      {actions}
    </div>
  );
}
