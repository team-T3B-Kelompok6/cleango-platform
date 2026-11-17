import Link from 'next/link';
import {
  DialogBody,
  DialogFooter,
  buttonVariants,
} from '@/components/shared/ui';
import { DialogCloseAction } from '@/components/shared/ui/DialogTrigger';
import { reportHref, type ReportTab } from '@/lib/reports';
import { REPORT_COPY } from './data';

const inputClass =
  'min-h-44 w-full min-w-0 rounded-control border border-line bg-surface px-12 py-10 text-base text-ink';

/** Isi dialog periode: pilih bulan laporan atau kembali ke semua periode. */
export function PeriodDialog({
  month,
  tab,
}: {
  month: string;
  tab: ReportTab;
}) {
  return (
    <form action="/laporan" method="get" className="flex min-h-0 flex-col">
      <input type="hidden" name="tab" value={tab} />
      <DialogBody className="flex flex-col gap-12">
        <label className="flex flex-col gap-8 text-sm font-semibold text-ink-soft">
          {REPORT_COPY.period.label}
          <input
            name="month"
            type="month"
            defaultValue={month}
            className={inputClass}
          />
        </label>
        <p className="text-sm leading-[1.6] text-ink-muted">
          Kosongkan atau pilih “Semua periode” untuk menampilkan seluruh
          transaksi selesai.
        </p>
      </DialogBody>
      <DialogFooter className="items-center">
        <DialogCloseAction />
        <Link
          className={buttonVariants({ variant: 'ghost' })}
          href={reportHref({ tab })}
        >
          {REPORT_COPY.period.all}
        </Link>
        <button
          type="submit"
          className={buttonVariants({ variant: 'primary' })}
        >
          {REPORT_COPY.period.apply}
        </button>
      </DialogFooter>
    </form>
  );
}
