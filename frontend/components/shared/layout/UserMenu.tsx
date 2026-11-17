import { logoutAction } from '@/app/actions';
import { Icon } from '@/components/shared/ui/Icon';
import { Avatar } from '@/components/shared/ui/Avatar';
import { SHELL_COPY } from './data';

export function UserMenu() {
  return (
    <>
      <button
        type="button"
        popoverTarget="admin-profile"
        aria-label={SHELL_COPY.profileMenu}
        className="flex items-center gap-10 border-l border-line pl-14 text-left max-sm:pl-8"
      >
        <Avatar>AO</Avatar>
        <span className="flex flex-col gap-[3px] max-sm:hidden">
          <strong className="text-sm leading-[1.4] font-semibold">
            {SHELL_COPY.profileName}
          </strong>
          <small className="text-[11px] leading-[1.3] font-bold tracking-[0.025em] text-success">
            {SHELL_COPY.profileRole}
          </small>
        </span>
        <Icon name="down" className="ml-10 size-12 max-sm:hidden" />
      </button>
      <div
        id="admin-profile"
        popover="auto"
        className="inset-auto top-65 right-24 m-0 w-[min(23rem,calc(100vw-2rem))] rounded-card border border-line bg-surface p-18 shadow-popover"
      >
        <strong className="text-base font-semibold">
          {SHELL_COPY.profileName}
        </strong>
        <p className="my-6 mb-16 text-base text-ink-muted">
          {SHELL_COPY.profileTitle}
        </p>
        <form action={logoutAction}>
          <button className="flex min-h-40 w-full items-center justify-center gap-8 rounded-md border border-line bg-surface px-16 py-9 text-md font-bold text-ink-soft transition-colors hover:border-line-strong hover:bg-surface-tint">
            <Icon name="logout" />
            {SHELL_COPY.logout}
          </button>
        </form>
      </div>
    </>
  );
}
