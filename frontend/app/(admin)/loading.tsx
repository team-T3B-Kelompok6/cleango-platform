export default function Loading() {
  return (
    <div className="next-skeleton" role="status" aria-label="Memuat halaman">
      <div className="skeleton-line" />
      <div className="metrics-grid order-metrics">
        {[1, 2, 3].map((n) => (
          <div key={n} className="skeleton-card" />
        ))}
      </div>
      <p className="muted">Memuat data…</p>
    </div>
  );
}
