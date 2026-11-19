'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { NAV_ITEMS } from '../data';

const baseClass =
  'flex w-full items-center gap-11 rounded-control px-12 py-11 text-md font-medium whitespace-nowrap text-ink-soft transition-colors';

export function SidebarNav({
  showLabels = true,
  onNavigate,
}: {
  showLabels?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className={cn('flex flex-col gap-5', !showLabels && 'px-0')}>
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            data-status={active ? 'active' : 'inactive'}
            onClick={onNavigate}
            className={cn(
              baseClass,
              active
                ? 'bg-accent font-semibold text-white shadow-action hover:bg-accent-hover'
                : 'hover:bg-surface-tint',
              !showLabels && 'justify-center gap-7 px-8',
            )}
          >
            <Icon
              name={item.icon}
              className={cn(active && '[filter:brightness(0)_invert(1)]')}
            />
            <span className={cn(!showLabels && 'hidden')}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
