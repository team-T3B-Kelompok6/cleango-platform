import { MetricCard } from './MetricCard';
import { rupiah } from '@/lib/resources';
import type { Resource, RecordData } from '@/types';
import { needsAssignment } from '@/lib/order-flow';
import { promoListState } from '@/lib/promos';
import { promoStatus } from '@/lib/promo-rules';
export async function Summary({
  resource,
  records,
  categoryNames = [],
}: {
  resource: Resource;
  records: RecordData[];
  categoryNames?: string[];
}) {
  const active = records.filter(
    (item) =>
      item.active === true ||
      item.published === true ||
      item.status === 'Tersedia',
  ).length;
  if (resource === 'faqs') {
    const categories = [
      ...new Set([
        ...categoryNames,
        ...records.map((record) => String(record.category)),
      ]),
    ];
    const mostRead = [...records]
      .filter((item) => typeof item.viewCount === 'number')
      .sort((a, b) => Number(b.viewCount) - Number(a.viewCount))[0];
    return (
      <div className="metrics-grid order-metrics faq-summary-grid">
        <MetricCard
          label="FAQ aktif"
          value={active}
          unit="Pertanyaan"
          note="Siap ditampilkan kepada pelanggan"
          icon="faq"
        />
        <MetricCard
          label="Paling sering dibaca"
          value={mostRead ? String(mostRead.question) : '—'}
          compactValue={!!mostRead}
          note={
            mostRead
              ? String(mostRead.viewCount) + ' kali dibaca'
              : 'Belum ada statistik pembaca'
          }
          icon="faq"
          uiIcon="eye"
          tone="amber"
        />
        <MetricCard
          label="Kategori FAQ"
          value={categories.length}
          unit="Kategori"
          note={categories.slice(0, 3).join(' · ') || 'Belum ada kategori'}
          icon="package"
          tone="blue"
        />
      </div>
    );
  }
  if (resource === 'orders')
    return (
      <div className="metrics-grid order-metrics">
        <MetricCard
          label="Perlu ditugaskan"
          value={records.filter(needsAssignment).length}
          note="Harus segera di-assign"
          icon="clock"
          tone="amber"
        />
        <MetricCard
          label="Petugas di lapangan"
          value={
            new Set(
              records
                .filter((order) =>
                  ['Menuju Lokasi', 'Sedang Dikerjakan'].includes(
                    String(order.status),
                  ),
                )
                .flatMap((order) =>
                  (order.staff as string[]).filter((name) => {
                    const progress = (
                      order as import('@/types').Order
                    ).staffProgress?.find((item) => item.staffName === name);
                    return (
                      !progress ||
                      ['en_route', 'working'].includes(progress.stage)
                    );
                  }),
                ),
            ).size
          }
          note="Petugas dari pesanan berjalan"
          icon="working"
          tone="blue"
        />
        <MetricCard
          label="Pesanan selesai"
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
    const ready = records.filter((item) =>
      ['Terjadwal', 'Berlangsung'].includes(String(item.status)),
    );
    return (
      <div className="metrics-grid order-metrics">
        <MetricCard
          label="Total jadwal"
          value={records.length}
          unit="Jadwal"
          note="Jadwal operasional terdaftar"
          icon="schedule"
        />
        <MetricCard
          label="Petugas terjadwal"
          value={staff.size}
          unit="Petugas"
          note="Petugas pada jadwal terdaftar"
          icon="customers"
          tone="blue"
        />
        <MetricCard
          label="Shift aktif"
          value={ready.length}
          unit="Shift"
          note="Jadwal yang dapat menerima penugasan"
          icon="clock"
          tone="amber"
        />
      </div>
    );
  }
  if (resource === 'services') {
    const { promos, message } = await promoListState();
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
    }).format(new Date());
    const categories = new Set([
      ...categoryNames,
      ...records.map((item) => String(item.category)),
    ]);
    return (
      <div className="metrics-grid order-metrics">
        <MetricCard
          label="Layanan aktif"
          value={active}
          unit="Layanan"
          note={`${categories.size} kategori tersedia`}
          icon="services"
        />
        <MetricCard
          label="Kode promo aktif"
          value={
            message
              ? '—'
              : promos.filter((promo) => promoStatus(promo, today) === 'Aktif')
                  .length
          }
          unit="Kode"
          note={message || 'Diatur melalui Kelola Promo'}
          icon="orders"
          tone="blue"
        />
        <MetricCard
          label="Harga rata-rata"
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
  const available = records.filter(
    (item) => item.operationalStatus === 'Siaga & Tersedia',
  ).length;
  const working = records.filter((item) =>
    ['Menuju Lokasi', 'Sedang Bekerja', 'Bertugas'].includes(
      String(item.operationalStatus),
    ),
  ).length;
  const repeat = records.filter(
    (item) => Number(item.orderCount ?? 0) >= 2,
  ).length;
  return (
    <div className="metrics-grid order-metrics">
      <MetricCard
        label={isStaff ? 'Petugas aktif' : 'Total pelanggan'}
        value={
          isStaff
            ? records.filter(
                (item) =>
                  !['Masa Training', 'Nonaktif'].includes(String(item.status)),
              ).length
            : records.length
        }
        unit={isStaff ? 'Petugas' : 'Customer'}
        note={
          isStaff
            ? 'Petugas tersedia dan sedang bertugas'
            : 'Pelanggan dalam data terdaftar'
        }
        icon="customers"
      />
      <MetricCard
        label={isStaff ? 'Petugas tersedia' : 'Pelanggan berulang'}
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
        label={isStaff ? 'Sedang bertugas' : 'Nilai transaksi selesai'}
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
