import { MetricCard, MetricGrid, UiIcon } from '@/components/shared/ui';
import { AUDIT_COPY } from './data';

/** Ringkasan jumlah aktivitas/admin dan kartu penjelas riwayat. */
export function AuditMetrics({
  total,
  admins,
  loading,
  filtered,
}: {
  total: number;
  admins: number;
  loading: boolean;
  filtered: boolean;
}) {
  const { metrics } = AUDIT_COPY;
  return (
    <MetricGrid
      columns={3}
      className="mt-22 max-lg:grid-cols-2 max-sm:grid-cols-1"
    >
      <MetricCard
        label={metrics.found}
        value={loading ? '—' : total}
        unit={loading ? undefined : metrics.foundUnit}
        note={filtered ? metrics.foundFiltered : metrics.foundAll}
        icon="report"
        uiIcon="clock"
      />
      <MetricCard
        label={metrics.admins}
        value={loading ? '—' : admins}
        unit={loading ? undefined : metrics.adminsUnit}
        note={metrics.adminsNote}
        icon="staff"
        uiIcon="person"
        tone="blue"
      />
      <div className="flex min-w-0 items-start gap-14 rounded-card border border-line bg-canvas p-22 max-lg:col-span-2 max-sm:col-span-1">
        <span className="grid size-32 shrink-0 place-items-center rounded-control bg-accent-soft text-accent">
          <UiIcon name="shield" />
        </span>
        <div className="min-w-0">
          <strong className="block text-md font-semibold text-ink">
            {metrics.readOnlyTitle}
          </strong>
          <p className="mt-8 text-sm leading-[1.7] text-ink-muted">
            {metrics.readOnlyText}
          </p>
        </div>
      </div>
    </MetricGrid>
  );
}
