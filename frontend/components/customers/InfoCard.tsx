import type { ReactNode } from 'react';
import { UiIcon, type UiIconName } from '@/components/shared/ui';

/** Satu blok informasi berikon di detail customer. */
export function InfoCard({
  icon,
  label,
  children,
}: {
  icon: UiIconName;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-10 border-b border-line-soft py-16">
      <span className="grid size-30 shrink-0 place-items-center rounded-control bg-surface-soft text-accent">
        <UiIcon name={icon} />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm leading-[1.5] font-medium text-ink-muted">
          {label}
        </h3>
        {children}
      </div>
    </div>
  );
}
