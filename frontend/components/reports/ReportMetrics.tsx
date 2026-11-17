import { MetricCard, MetricGrid } from '@/components/shared/ui';
import { rupiah } from '@/lib/resources';

/** Tiga angka utama laporan periode terpilih. */
export function ReportMetrics({
  total,
  customers,
  count,
}: {
  total: number;
  customers: number;
  count: number;
}) {
  return (
    <MetricGrid
      columns={3}
      className="mt-22 max-md:grid-cols-2 max-sm:grid-cols-1"
    >
      <MetricCard
        label="Pendapatan selesai"
        value={rupiah(total)}
        note="Pesanan selesai dalam periode"
        icon="services"
        uiIcon="wallet"
      />
      <MetricCard
        label="Pelanggan aktif"
        value={customers}
        unit="Customer"
        note="Pelanggan dengan pesanan selesai"
        icon="customers"
        tone="blue"
      />
      <MetricCard
        label="Pesanan selesai"
        value={count}
        unit="Order"
        note="Pesanan selesai dalam periode"
        icon="orders"
        tone="amber"
      />
    </MetricGrid>
  );
}
