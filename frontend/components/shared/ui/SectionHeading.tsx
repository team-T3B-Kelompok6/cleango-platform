import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Judul seksi di dalam halaman: judul kiri, meta atau aksi di kanan. */
export function SectionHeading({
  title,
  meta,
  action,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mt-24 mb-12 flex flex-wrap items-center justify-between gap-16',
        className,
      )}
    >
      <h2 className="font-display text-base leading-[1.3] font-bold text-ink">
        {title}
      </h2>
      {meta && <small className="text-sm text-ink-meta">{meta}</small>}
      {action}
    </div>
  );
}
