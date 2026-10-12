import { MetricCard } from './MetricCard';
import { Icon } from './Icon';
import { UiIcon } from './UiIcon';
import { rupiah } from '@/lib/resources';
import type { Resource, RecordData } from '@/types';
export function Summary({
  resource,
  records,
}: {
  resource: Resource;
  records: RecordData[];
}) {
  const active = records.filter(
    (item) =>
      item.active === true ||
      item.published === true ||
      item.status === 'Tersedia',
  ).length;
  if (resource === 'faqs') {
    const categories = [
      ...new Set(records.map((record) => String(record.category))),
    ];
    return (
      <div className="faq-summary-grid">
        <article className="faq-summary-card">
          <div>
            <small>TOTAL FAQ AKTIF</small>
            <strong>
              {active} <span>Pertanyaan</span>
            </strong>
            <p className="green">Siap ditampilkan kepada pelanggan</p>
          </div>
          <span className="faq-summary-icon green">
            <Icon name="faq" />
          </span>
        </article>
        <article className="faq-summary-card">
          <div>
            <small>PALING SERING DIBACA</small>
            <strong className="faq-most-read">
              {records.some((item) => typeof item.viewCount === 'number')
                ? String(
                    [...records].sort(
                      (a, b) =>
                        Number(b.viewCount ?? 0) - Number(a.viewCount ?? 0),
                    )[0]?.question ?? '—',
                  )
                : 'Belum ada data pembaca'}
            </strong>
            <p className="faq-summary-caption">
              {records.some((item) => typeof item.viewCount === 'number')
                ? `${Math.max(...records.map((item) => Number(item.viewCount ?? 0)))} kali dibaca`
                : 'Statistik pembaca belum tersedia'}
            </p>
          </div>
          <span className="faq-summary-icon amber">
            <UiIcon name="eye" />
          </span>
        </article>
        <article className="faq-summary-card">
          <div>
            <small>KATEGORI</small>
            <strong>
              {categories.length} <span>Klasifikasi</span>
            </strong>
            <div className="faq-category-samples">
              {categories.slice(0, 3).map((category) => (
                <span key={category}>{category}</span>
              ))}
            </div>
          </div>
          <span className="faq-summary-icon blue">
            <Icon name="package" />
          </span>
        </article>
      </div>
    );
  }
  if (resource === 'orders')
    return (
      <div className="metrics-grid order-metrics">
        <MetricCard
          label="PERLU TINDAKAN (UNASSIGNED)"
          value={
            records.filter((order) =>
              ['Menunggu Assign', 'Menunggu Lokasi'].includes(
                String(order.status),
              ),
            ).length
          }
          note="Harus segera di-assign"
          icon="clock"
          tone="amber"
        />
        <MetricCard
          label="KRU LAPANGAN AKTIF"
          value={
            new Set(
              records
                .filter((order) => order.status === 'Sedang Dikerjakan')
                .flatMap((order) => order.staff as string[]),
            ).size
          }
          note="Petugas dari pesanan berjalan"
          icon="working"
          tone="blue"
        />
        <MetricCard
          label="TUNTAS"
          value={records.filter((order) => order.status === 'Selesai').length}
          note="Pesanan selesai"
          icon="check"
        />
      </div>
    );
  if (resource === 'schedules') {
    const assigned = records.filter(
      (item) =>
        String(item.staff ?? '').trim() && item.staff !== 'Belum ditugaskan',
    );
    const staff = new Set(
      assigned.flatMap((item) =>
        String(item.staff).split(' & ').filter(Boolean),
      ),
    );
    const unassigned = records.filter((item) => !assigned.includes(item));
    return (
      <div className="metrics-grid order-metrics">
        <MetricCard
          label="TOTAL JADWAL"
          value={records.length}
          unit="Jadwal"
          note="Jadwal operasional terdaftar"
          icon="schedule"
        />
        <MetricCard
          label="PETUGAS BERJAGA"
          value={staff.size}
          unit="Petugas"
          note="Petugas pada jadwal terdaftar"
          icon="customers"
          tone="blue"
        />
        <MetricCard
          label="JADWAL BELUM FIX"
          value={unassigned.length}
          unit="Perlu Dicek"
          note="Jadwal belum memiliki petugas"
          icon="clock"
          tone="amber"
        />
      </div>
    );
  }
  if (resource === 'services') {
    const categories = new Set(records.map((item) => String(item.category)));
    const hasFavorites = records.some(
      (item) => typeof item.isFavorite === 'boolean',
    );
    return (
      <div className="metrics-grid order-metrics">
        <MetricCard
          label="TOTAL LAYANAN AKTIF"
          value={active}
          unit="Layanan"
          note={`Terbagi dalam ${categories.size} kategori utama`}
          icon="services"
        />
        <MetricCard
          label="PAKET & BUNDLE FAVORIT"
          value={
            hasFavorites
              ? records.filter((item) => item.isFavorite === true).length
              : '—'
          }
          unit="Paket"
          note={
            hasFavorites
              ? 'Paket pilihan pelanggan'
              : 'Status favorit belum tersedia'
          }
          icon="orders"
          tone="blue"
        />
        <MetricCard
          label="HARGA RATA-RATA"
          value={rupiah(
            records.length
              ? records.reduce((sum, item) => sum + Number(item.price), 0) /
                  records.length
              : 0,
          )}
          note="Rata-rata harga layanan terdaftar"
          icon="services"
          uiIcon="wallet"
        />
      </div>
    );
  }
  const isStaff = resource === 'staff';
  const available = records.filter((item) => item.status === 'Tersedia').length;
  const working = records.filter((item) => item.status === 'Bertugas').length;
  const repeat = records.filter(
    (item) => Number(item.orderCount ?? 0) >= 2,
  ).length;
  return (
    <div className="metrics-grid order-metrics">
      <MetricCard
        label={isStaff ? 'TOTAL PETUGAS AKTIF' : 'TOTAL CUSTOMER TERDAFTAR'}
        value={isStaff ? available + working : records.length}
        unit={isStaff ? 'Petugas' : 'Customer'}
        note={
          isStaff
            ? 'Petugas tersedia dan sedang bertugas'
            : 'Pelanggan dalam data terdaftar'
        }
        icon="customers"
      />
      <MetricCard
        label={isStaff ? 'SIAGA & TERSEDIA' : 'PELANGGAN BERULANG'}
        value={
          isStaff
            ? available
            : `${records.length ? Math.round((repeat / records.length) * 100) : 0}%`
        }
        unit={isStaff ? 'Siaga' : 'Pelanggan'}
        note={
          isStaff
            ? 'Siap ditugaskan untuk order baru'
            : 'Pelanggan dengan minimal dua pesanan'
        }
        icon="clock"
        tone={isStaff ? 'blue' : 'amber'}
      />
      <MetricCard
        label={isStaff ? 'PETUGAS DI LUAR' : 'TOTAL TRANSAKSI SELESAI'}
        value={
          isStaff
            ? working
            : rupiah(
                records.reduce(
                  (sum, item) => sum + Number(item.totalSpent ?? 0),
                  0,
                ),
              )
        }
        note={
          isStaff
            ? 'Sedang pengerjaan di tempat klien'
            : 'Akumulasi pesanan pelanggan yang selesai'
        }
        icon="working"
        tone="amber"
      />
    </div>
  );
}
