import type { Order } from '@/types';
import { EmptyState } from '@/components/ui';
import { rupiah } from '@/lib/resources';
import {
  REPORT_TABS,
  type ReportGroup,
  type ReportTab,
} from '../data/reportRules';
import { ReportRow } from './ReportRow';
import {
  REPORT_COPY,
  reportAmountClass,
  reportRowClass,
  reportRowMainClass,
} from '../data/reportCopy';

/** Daftar laporan: baris pesanan atau agregat per tanggal/pelanggan/kru. */
export function ReportList({
  tab,
  orders,
  groups,
  total,
}: {
  tab: ReportTab;
  orders: Order[];
  groups: ReportGroup[];
  total: number;
}) {
  const empty = !total;
  return (
    <div className="mt-16 flex flex-col gap-10">
      {tab === REPORT_TABS[0]
        ? orders.map((order) => <ReportRow key={order.id} order={order} />)
        : groups.map((group) => (
            <article key={group.name} className={reportRowClass}>
              <div className={reportRowMainClass}>
                <h3 className="text-md leading-[1.4] font-semibold break-words text-ink">
                  {group.name}
                </h3>
                <p className="mt-4 text-xs leading-[1.6] text-ink-muted">
                  {group.count} pesanan selesai
                  {tab === REPORT_TABS[3] ? REPORT_COPY.staffNote : ''}
                </p>
              </div>
              <strong className={reportAmountClass}>
                {rupiah(group.amount)}
              </strong>
            </article>
          ))}
      {empty && (
        <EmptyState
          title={REPORT_COPY.empty.title}
          description={REPORT_COPY.empty.description}
        />
      )}
    </div>
  );
}
