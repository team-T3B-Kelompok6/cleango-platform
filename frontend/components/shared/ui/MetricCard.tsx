import { Icon, type IconName } from './Icon';
import { UiIcon, type UiIconName } from './UiIcon';
import { cn } from '@/lib/cn';

type MetricTone = 'green' | 'blue' | 'amber';

const TONE_CLASS: Record<MetricTone, { icon: string; text: string }> = {
  green: { icon: 'bg-accent-soft text-accent', text: 'text-accent' },
  blue: { icon: 'bg-info-soft text-info', text: 'text-info' },
  amber: { icon: 'bg-warning-soft text-warning', text: 'text-warning' },
};

export function MetricCard({
  label,
  value,
  unit,
  note,
  icon,
  tone = 'green',
  uiIcon,
  compactValue = false,
  className,
}: {
  label: string;
  value: number | string;
  unit?: string;
  note: string;
  icon?: IconName;
  tone?: MetricTone;
  uiIcon?: UiIconName;
  compactValue?: boolean;
  className?: string;
}) {
  const toneClass = TONE_CLASS[tone];
  return (
    <article
      className={cn(
        'flex min-h-[124px] flex-col gap-8 overflow-hidden rounded-card border border-line bg-surface p-20',
        className,
      )}
    >
      <div className="flex min-h-32 items-start justify-between gap-10">
        <p className="min-w-0 text-base leading-[1.5] font-medium text-ink-muted">
          {label}
        </p>
        <span
          className={cn(
            'grid size-32 shrink-0 place-items-center rounded-control',
            toneClass.icon,
          )}
        >
          {uiIcon ? <UiIcon name={uiIcon} /> : icon && <Icon name={icon} />}
        </span>
      </div>
      <div
        className={cn(
          'flex flex-wrap items-baseline gap-x-6 font-display font-bold text-ink',
          compactValue ? 'text-lg leading-[1.2]' : 'text-5xl leading-[1.2]',
        )}
      >
        {value}
        {unit && <span className="text-sm text-ink-muted">{unit}</span>}
      </div>
      <span className="mt-auto text-sm leading-[1.6] text-ink-muted">
        {note}
      </span>
    </article>
  );
}
