import Link from 'next/link';
import { ApiError } from '@/lib/api';
import { listAuditLogs } from '../api/auditApi';
import {
  auditFilters,
  auditHasFilter,
  auditIssue,
  auditPageCount,
  auditQuery,
  auditSelectedAdminMissing,
} from '@/lib/audit';
import { adminDemoEnabled } from '@/lib/demo/mode';
import {
  PageHeader,
  Pagination,
  UiIcon,
  buttonVariants,
} from '@/components/ui';
import type { Search } from '@/types';
import type { AuditPage } from '@/types/audit';
import { AuditFilterBar } from '../components/AuditFilterBar';
import { AuditList } from '../components/AuditList';
import { AuditMetrics } from '../components/AuditMetrics';
import { AuditState } from '../components/AuditState';
import { AUDIT_COPY, panelClass } from '../data/auditCopy';

/** Halaman audit log: ambil riwayat, tentukan status, lalu rangkai bagian UI. */
export async function AuditPage({ search }: { search: Search }) {
  const { filters, error: filterError } = auditFilters(search);
  let result: AuditPage = {
    data: [],
    admins: [],
    meta: { total: 0, page: filters.page, pageSize: 8 },
  };
  let issue: 'unavailable' | 'error' | null = null;
  if (!filterError) {
    try {
      result = await listAuditLogs(filters);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      issue = auditIssue(error.status);
    }
  }
  const { data, admins, meta } = result;
  const pageCount = auditPageCount(meta);
  const selectedAdminMissing = auditSelectedAdminMissing(filters, admins);
  const hasFilter = auditHasFilter(filters);
  const loading = !!issue || !!filterError;
  const href = (page: number) => '/audit-log?' + auditQuery(filters, page);
  const from = meta.total ? (filters.page - 1) * meta.pageSize + 1 : 0;
  const to = Math.min(filters.page * meta.pageSize, meta.total);
  const { filters: filterCopy, states, demo } = AUDIT_COPY;
  return (
    <div className="grid gap-20">
      <PageHeader
        title={AUDIT_COPY.title}
        description={AUDIT_COPY.description}
        actions={
          <a
            className={buttonVariants({
              variant: 'ghost',
              className: 'gap-6',
            })}
            href={filterError ? '/audit-log' : href(filters.page)}
          >
            <UiIcon name="clock" /> {AUDIT_COPY.reload}
          </a>
        }
      />
      {adminDemoEnabled() && (
        <p
          role="note"
          className="flex items-start gap-10 rounded-[10px] border border-info-soft bg-info-soft px-16 py-13 text-sm leading-[1.6] text-info"
        >
          <UiIcon name="eye" className="mt-2 shrink-0" />
          <span>
            <strong>{demo.lead}</strong>
            {demo.text}
          </span>
        </p>
      )}
      <AuditMetrics
        total={meta.total}
        admins={admins.length}
        loading={loading}
        filtered={hasFilter}
      />
      <section className={panelClass} aria-label={filterCopy.label}>
        <AuditFilterBar
          filters={filters}
          admins={admins}
          selectedAdminMissing={selectedAdminMissing}
        />
        {filterError ? (
          <AuditState
            icon="calendar"
            title={states.filterTitle}
            text={filterError}
            tone="danger"
            role="alert"
            action={
              <Link
                className={buttonVariants({ variant: 'ghost' })}
                href="/audit-log"
              >
                {states.filterAction}
              </Link>
            }
          />
        ) : issue ? (
          <AuditState
            icon="clock"
            title={
              issue === 'unavailable'
                ? states.unavailableTitle
                : states.errorTitle
            }
            text={
              issue === 'unavailable'
                ? states.unavailableText
                : states.errorText
            }
            tone={issue === 'error' ? 'danger' : 'info'}
            role={issue === 'error' ? 'alert' : 'status'}
            action={
              <a
                className={buttonVariants({ variant: 'primary' })}
                href={href(filters.page)}
              >
                {states.retry}
              </a>
            }
          />
        ) : !data.length ? (
          <AuditState
            icon="search"
            title={
              filters.page > pageCount
                ? states.pageMissingTitle
                : hasFilter
                  ? states.emptyFilteredTitle
                  : states.emptyTitle
            }
            text={hasFilter ? states.emptyFilteredText : states.emptyText}
            action={
              (hasFilter || filters.page > 1) && (
                <Link
                  className={buttonVariants({ variant: 'ghost' })}
                  href={filters.page > 1 ? href(1) : '/audit-log'}
                >
                  {filters.page > 1 ? states.firstPage : states.resetFilter}
                </Link>
              )
            }
          />
        ) : (
          <>
            <AuditList logs={data} page={filters.page} meta={meta} />
            <Pagination
              page={filters.page}
              pageCount={pageCount}
              from={from}
              to={to}
              total={meta.total}
              href={href}
              label={AUDIT_COPY.pagination.label}
            />
          </>
        )}
      </section>
    </div>
  );
}
