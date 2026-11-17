import type { ReactNode } from 'react';
import { MobileNav } from './MobileNav';
import { SearchField } from './SearchField';
import { TopbarDate } from './TopbarDate';
import { UserMenu } from './UserMenu';

export function Topbar({
  date,
  actions,
}: {
  date: string;
  actions: ReactNode;
}) {
  return (
    <header
      data-topbar
      className="sticky top-0 z-50 flex h-72 shrink-0 items-center justify-between gap-12 border-b border-line bg-surface/92 px-15 backdrop-blur-[10px] max-sm:h-66 max-sm:gap-10 max-sm:px-16"
    >
      <MobileNav />
      <SearchField />
      <div className="ml-auto flex shrink-0 items-center gap-9 max-sm:gap-8">
        <TopbarDate date={date} />
        {actions}
        <UserMenu />
      </div>
    </header>
  );
}
