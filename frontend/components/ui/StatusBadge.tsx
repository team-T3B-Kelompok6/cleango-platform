import { orderStatusLabel } from '@/lib/order-flow';
import { cn } from '@/lib/cn';
import { statusTone } from './statusTone';

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const tone = statusTone(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-5 rounded-full px-8 py-5 text-xs leading-[12px] font-bold whitespace-nowrap',
        tone.bg,
        tone.text,
        className,
      )}
    >
      <i className={cn('size-[5px] shrink-0 rounded-full bg-current')} />
      {orderStatusLabel(status)}
    </span>
  );
}
