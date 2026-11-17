import type { ReactNode } from 'react';
import { UiIcon, type UiIconName } from '@/components/shared/ui';
import { cn } from '@/lib/cn';

/** Pesan status halaman audit: filter salah, gagal muat, atau kosong. */
export function AuditState({
  icon,
  title,
  text,
  tone = 'empty',
  action,
  role,
}: {
  icon: UiIconName;
  title: string;
  text?: string;
  tone?: 'empty' | 'info' | 'danger';
  action?: ReactNode;
  role?: 'alert' | 'status';
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-danger'
      : tone === 'info'
        ? 'text-info'
        : 'text-ink-faint';
  return (
    <div
      role={role}
      className="grid justify-items-center gap-14 px-24 py-56 text-center"
    >
      <UiIcon name={icon} className={cn('size-34', toneClass)} />
      <h2 className="text-lg leading-[1.4] font-semibold text-ink">{title}</h2>
      {text && (
        <p className="max-w-[460px] text-base leading-[1.7] text-ink-muted">
          {text}
        </p>
      )}
      {action && (
        <div className="mt-4 flex flex-wrap justify-center gap-10">
          {action}
        </div>
      )}
    </div>
  );
}
