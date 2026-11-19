import { MetricCard, MetricGrid } from '@/components/ui';
import { rupiah } from '@/lib/resources';
import type { Resource, RecordData } from '@/types';
import { needsAssignment } from '@/lib/order-flow';
import { promoListState } from '@/lib/promos';
import { promoStatus } from '@/lib/promo-rules';
import { faqSummary } from '@/features/faqs';
import { staffSummary } from '@/lib/staff';
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
    const { categories, mostRead } = faqSummary(records, categoryNames);
    return (
      <MetricGrid columns={3} className="mt-22">
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
      </MetricGrid>
    );
  }
  if (resource === 'orders')
    return (
      <MetricGrid columns={3} className="mt-22">
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
      </MetricGrid>
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
      <MetricGrid columns={3} className="mt-22">
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
      </MetricGrid>
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
      <MetricGrid columns={3} className="mt-22">
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
      </MetricGrid>
    );
  }
  const isStaff = resource === 'staff';
  const staffCounts = staffSummary(records);
  const available = staffCounts.available;
  const working = staffCounts.working;
  const repeat = records.filter(
    (item) => Number(item.orderCount ?? 0) >= 2,
  ).length;
  return (
    <MetricGrid columns={3} className="mt-22">
      <MetricCard
        label={isStaff ? 'Petugas aktif' : 'Total pelanggan'}
        value={isStaff ? staffCounts.active : records.length}
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
    </MetricGrid>
  );
}
