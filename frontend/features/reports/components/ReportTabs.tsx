import Link from 'next/link';
import { Tabs } from '@/components/ui';
import { cn } from '@/lib/cn';
import { REPORT_TABS, reportHref, type ReportTab } from '../data/reportRules';
import { REPORT_COPY } from '../data/reportCopy';

/** Tab jenis laporan; navigasi server lewat tautan. */
export function ReportTabs({ month, tab }: { month: string; tab: ReportTab }) {
  return (
    <Tabs label={REPORT_COPY.tabsLabel} className="my-16 min-h-40">
      {REPORT_TABS.map((label) => (
        <Link
          key={label}
          aria-current={tab === label ? 'page' : undefined}
          href={reportHref({ month, tab: label })}
          scroll={false}
          className={cn(
            'inline-flex min-h-40 items-center rounded-[7px] px-14 py-10 text-base whitespace-nowrap transition-colors',
            tab === label
              ? 'bg-accent font-semibold text-white'
              : 'font-medium text-ink-soft hover:bg-surface-tint',
          )}
        >
          {label}
        </Link>
      ))}
    </Tabs>
  );
}
