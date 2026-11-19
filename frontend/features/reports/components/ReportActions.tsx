import { DialogTrigger, UiIcon, buttonVariants } from '@/components/ui';
import { reportExportHref, type ReportTab } from '../data/reportRules';
import { PeriodDialog } from './PeriodDialog';
import { REPORT_COPY } from '../data/reportCopy';

/** Aksi header laporan: pilih periode dan unduh CSV. */
export function ReportActions({
  month,
  tab,
  monthLabel,
}: {
  month: string;
  tab: ReportTab;
  monthLabel: string;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-10 max-sm:w-full">
      <DialogTrigger
        label={monthLabel}
        title={REPORT_COPY.period.title}
        subtitle={REPORT_COPY.period.subtitle}
        icon="calendar"
        dialogIcon="calendar"
        dialogWidth={420}
        className={buttonVariants({ variant: 'ghost', className: 'gap-6' })}
      >
        <PeriodDialog month={month} tab={tab} />
      </DialogTrigger>
      <a
        className={buttonVariants({
          variant: 'primary',
          className: 'gap-6 max-sm:flex-1',
        })}
        href={reportExportHref(month)}
        download
      >
        <UiIcon name="download" />
        {REPORT_COPY.download}
      </a>
    </div>
  );
}
