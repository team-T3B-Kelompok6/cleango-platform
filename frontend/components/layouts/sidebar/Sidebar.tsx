import Link from 'next/link';
import { logoutAction } from '@/lib/api/logoutAction';
import { Icon } from '@/components/ui/Icon';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { cn } from '@/lib/cn';
import { SHELL_COPY } from '../data';
import { SidebarNav } from './SidebarNav';

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      aria-label={SHELL_COPY.navLabel}
      data-collapsed={collapsed ? 'true' : undefined}
      className="fixed inset-y-0 left-0 z-70 flex max-h-dvh w-240 flex-col overflow-y-auto border-r border-line bg-surface px-14 py-22 transition-[width] duration-200 data-[collapsed=true]:w-72 max-md:w-220 max-sm:w-240 max-sm:-translate-x-full"
    >
      <div
        className={cn(
          'flex items-center gap-10 border-b border-line pb-21',
          collapsed && 'flex-col gap-9 px-0 pb-16',
        )}
      >
        <Link
          href="/"
          aria-label={SHELL_COPY.home}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-10',
            collapsed && 'flex-none justify-center',
          )}
        >
          {collapsed ? <BrandLogo /> : <BrandLogo withWordmark />}
        </Link>
        <button
          type="button"
          aria-label={
            collapsed ? SHELL_COPY.sidebarExpand : SHELL_COPY.sidebarCollapse
          }
          aria-expanded={!collapsed}
          onClick={onToggle}
          className="inline-flex min-w-36 shrink-0 items-center justify-center rounded-control p-6 text-ink-soft transition-colors hover:bg-surface-tint"
        >
          <Icon
            name="chevron"
            className={cn('transition-transform', collapsed && '-rotate-90')}
          />
        </button>
      </div>
      <div className="pt-16">
        <SidebarNav showLabels={!collapsed} />
      </div>
      <div className="mt-auto border-t border-line pt-16">
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label={SHELL_COPY.logout}
            className={cn(
              'flex w-full items-center gap-11 rounded-control px-12 py-11 text-md font-medium whitespace-nowrap text-ink-soft transition-colors hover:bg-surface-tint',
              collapsed && 'justify-center gap-7 px-8',
            )}
          >
            <Icon name="logout" />
            <span className={cn(collapsed && 'hidden')}>
              {SHELL_COPY.logout}
            </span>
          </button>
        </form>
      </div>
    </aside>
  );
}
