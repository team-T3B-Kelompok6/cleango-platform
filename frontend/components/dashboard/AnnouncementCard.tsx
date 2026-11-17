import type { ReactNode } from 'react';
import { Icon } from '@/components/shared/ui';

export function AnnouncementCard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: ReactNode;
}) {
  return (
    <section className="mt-20 flex flex-col gap-12 rounded-card border border-line bg-accent-soft p-16 sm:flex-row sm:items-center sm:gap-13">
      <span className="grid size-[38px] shrink-0 place-items-center rounded-md bg-accent text-white">
        <Icon name="announcement" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-base leading-[1.3] font-bold text-ink">
          {title}
        </h3>
        <p className="mt-6 text-base leading-[1.6] text-ink-muted">{body}</p>
      </div>
      <div className="shrink-0 max-sm:self-start">{action}</div>
    </section>
  );
}
