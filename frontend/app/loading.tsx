import { MetricGrid } from '@/components/shared/ui';

export default function Loading() {
  return (
    <div className="next-skeleton" role="status" aria-label="Memuat halaman">
      <div className="skeleton-line" />
      <MetricGrid columns={3} className="mt-22">
        {[1, 2, 3].map((n) => (
          <div key={n} className="skeleton-card" />
        ))}
      </MetricGrid>
      <p className="muted">Memuat data…</p>
    </div>
  );
}
