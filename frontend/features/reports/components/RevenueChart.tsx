import { Card } from '@/components/ui';
import { barHeight } from '../data/reportRules';
import { rupiah } from '@/lib/resources';
import { REPORT_COPY } from '../data/reportCopy';

/** Grafik batang pendapatan mingguan dalam periode terpilih. */
export function RevenueChart({
  weeks,
  month,
}: {
  weeks: number[];
  month: string;
}) {
  const label = weeks
    .map(
      (sum, index) =>
        REPORT_COPY.chart.week + ' ' + (index + 1) + ': ' + rupiah(sum),
    )
    .join(', ');
  return (
    <Card className="p-18 max-sm:p-16">
      <h2 className="font-display text-sm leading-[1.4] font-bold text-ink">
        {REPORT_COPY.chart.title}
      </h2>
      <p className="mt-5 text-xs leading-[1.6] text-ink-muted">
        {month ? REPORT_COPY.chart.captionMonth : REPORT_COPY.chart.captionAll}
      </p>
      <div
        role="img"
        aria-label={label}
        className="mt-8 flex h-[225px] items-stretch justify-around gap-24 border-b border-line-strong px-25 pt-32 max-lg:gap-12 max-lg:px-0 max-sm:h-[215px]"
      >
        {weeks.map((sum, index) => (
          <div
            key={index}
            className="flex min-w-0 flex-1 flex-col items-center gap-10"
          >
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className="relative w-[60%] max-w-[46px] rounded-t-[8px] bg-accent"
                style={{ height: barHeight(weeks, sum) }}
              >
                <small className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 text-[9px] whitespace-nowrap text-ink-muted max-sm:text-[8px]">
                  {rupiah(sum)}
                </small>
              </div>
            </div>
            <span className="pb-8 text-[9px] whitespace-nowrap text-ink-meta max-sm:text-[8px]">
              {REPORT_COPY.chart.week} {index + 1}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
