import { list } from '@/lib/api';
import type { Order, Search } from '@/types';
import { PageHeader, Pagination } from '@/components/shared/ui';
import {
  completedOrders,
  groupReport,
  parseReportMonth,
  paymentBreakdown,
  reportHref,
  reportMonthLabel,
  reportSummary,
  reportTab,
  weeklyTotals,
  REPORT_TABS,
} from '@/lib/reports';
import { paginate, parsePage } from '@/lib/pagination';
import { ReportActions } from './ReportActions';
import { ReportMetrics } from './ReportMetrics';
import { ReportTabs } from './ReportTabs';
import { ReportList } from './ReportList';
import { RevenueChart } from './RevenueChart';
import { PaymentBreakdown } from './PaymentBreakdown';
import { REPORT_COPY } from './data';

/** Halaman laporan: ambil data, hitung ringkasan, lalu serahkan ke bagian UI. */
export async function ReportView({ params }: { params: Search }) {
  const month = parseReportMonth(params.month);
  const tab = reportTab(params.tab);
  const visible = completedOrders(await list<Order>('orders'), month);
  const { total, customers, count } = reportSummary(visible);
  const payments = paymentBreakdown(visible);
  const isSummary = tab === REPORT_TABS[0];
  const groups = isSummary ? [] : groupReport(visible, tab);
  const totalRows = isSummary ? visible.length : groups.length;
  const page = parsePage(params.page);
  const orderPage = isSummary ? paginate(visible, page) : null;
  const groupPage = isSummary ? null : paginate(groups, page);
  const paged = orderPage ??
    groupPage ?? { page: 1, pageCount: 1, from: 0, to: 0 };

  return (
    <div>
      <PageHeader
        title={REPORT_COPY.title}
        description={REPORT_COPY.description}
        actions={
          <ReportActions
            month={month}
            tab={tab}
            monthLabel={reportMonthLabel(month)}
          />
        }
      />
      <ReportMetrics total={total} customers={customers} count={count} />
      <div className="mt-24 grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-16 max-sm:grid-cols-1">
        <RevenueChart weeks={weeklyTotals(visible)} month={month} />
        <PaymentBreakdown
          entries={payments.entries}
          total={payments.total}
          missing={payments.missing}
        />
      </div>
      <ReportTabs month={month} tab={tab} />
      <ReportList
        key={tab}
        tab={tab}
        orders={orderPage?.shown ?? []}
        groups={groupPage?.shown ?? []}
        total={totalRows}
      />
      <Pagination
        page={paged.page}
        pageCount={paged.pageCount}
        from={paged.from}
        to={paged.to}
        total={totalRows}
        href={(page) => reportHref({ month, tab, page })}
        label={REPORT_COPY.title}
      />
    </div>
  );
}
