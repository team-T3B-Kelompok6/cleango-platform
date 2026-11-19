import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function TabButton({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-6 rounded-[7px] px-14 py-8 text-base font-bold whitespace-nowrap transition-colors',
        active
          ? 'bg-accent-bright text-white shadow-[0_2px_5px_rgba(32,200,117,0.25)]'
          : 'text-ink-soft hover:bg-surface-tint',
        className,
      )}
    >
      {children}
    </button>
  );
}
