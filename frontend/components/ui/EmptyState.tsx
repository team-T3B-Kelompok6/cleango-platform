import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-card border border-dashed border-line-strong bg-surface px-20 py-45 text-center',
        className,
      )}
    >
      <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
      {description && (
        <p className="mt-8 text-base leading-[1.55] text-ink-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-18 flex justify-center">{action}</div>}
    </div>
  );
}
