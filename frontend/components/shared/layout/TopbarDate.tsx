import { Icon } from '@/components/shared/ui/Icon';

export function TopbarDate({ date }: { date: string }) {
  return (
    <span className="flex items-center gap-7 text-sm text-ink-meta max-lg:hidden">
      <Icon name="calendar" />
      {date}
    </span>
  );
}
