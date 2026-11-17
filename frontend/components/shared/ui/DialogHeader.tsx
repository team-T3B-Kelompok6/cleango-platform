import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { DialogCloseButton } from './DialogCloseButton';

export function DialogHeader({
  title,
  subtitle,
  icon,
  onClose,
  className,
  titleId,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClose?: () => void;
  className?: string;
  titleId?: string;
}) {
  return (
    <div
      className={cn(
        'modal-header flex items-start justify-between gap-16 border-b border-line-soft bg-surface px-26 py-23',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-12">
        {icon}
        <div className="min-w-0">
          <h2
            id={titleId}
            className="font-display text-[20px] leading-[1.4] font-bold tracking-[-0.025em]"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-4 text-sm text-ink-muted">{subtitle}</p>
          )}
        </div>
      </div>
      {onClose && <DialogCloseButton onClose={onClose} />}
    </div>
  );
}
