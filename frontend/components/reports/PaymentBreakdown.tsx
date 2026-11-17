import { Card } from '@/components/shared/ui';
import type { PaymentEntry } from '@/lib/reports';
import { REPORT_COPY } from './data';

const progressClass =
  'mt-6 block h-7 w-full appearance-none overflow-hidden rounded-full bg-surface-soft ' +
  '[&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-surface-soft ' +
  '[&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-accent ' +
  '[&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-accent';

/** Sebaran metode pembayaran pada pesanan selesai. */
export function PaymentBreakdown({
  entries,
  total,
  missing,
}: {
  entries: PaymentEntry[];
  total: number;
  missing: number;
}) {
  return (
    <Card className="p-18 max-sm:p-16">
      <h2 className="font-display text-sm leading-[1.4] font-bold text-ink">
        {REPORT_COPY.payment.title}
      </h2>
      {entries.length ? (
        <div className="mt-24 grid gap-18">
          {entries.map(({ name, count, percent }) => (
            <div key={name}>
              <label
                htmlFor={'payment-' + encodeURIComponent(name)}
                className="flex justify-between gap-8 text-xs leading-[1.5] text-ink-soft"
              >
                <span className="min-w-0 break-words">{name}</span>
                <strong className="text-accent">{percent}%</strong>
              </label>
              <progress
                id={'payment-' + encodeURIComponent(name)}
                value={count}
                max={Math.max(1, total)}
                className={progressClass}
              />
            </div>
          ))}
          {missing > 0 && (
            <p className="text-xs leading-[1.7] text-ink-muted">
              {missing} {REPORT_COPY.payment.missing}
            </p>
          )}
        </div>
      ) : (
        <p className="my-28 text-xs leading-[1.7] text-ink-muted">
          {REPORT_COPY.payment.empty}
        </p>
      )}
    </Card>
  );
}
