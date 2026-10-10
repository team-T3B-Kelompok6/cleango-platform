import type { Metadata } from 'next';
import Link from 'next/link';
import { list } from '@/lib/api';
import { tone } from '@/lib/resources';
import type { Order } from '@/types';
import { MetricCard } from '@/components/MetricCard';
import { Icon } from '@/components/Icon';
import { SopButton } from '@/components/SopButton';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Dashboard Utama' };
export default async function Dashboard() {
  const orders = await list<Order>('orders');
  const now = new Date();
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
  }).format(now);
  const dailyOrders = orders.filter((order) => order.date === today);
  const counts = (status: string) =>
    dailyOrders.filter((order) => order.status === status).length;
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Halo, Admin Cleango!</h1>
          <p>
            Berikut ringkasan operasional kebersihan hari ini,{' '}
            {new Intl.DateTimeFormat('id-ID', {
              dateStyle: 'full',
              timeZone: 'Asia/Jakarta',
            }).format(now)}
            .
          </p>
        </div>
      </div>
      <section className="announcement">
        <span className="announcement-icon">
          <Icon name="announcement" />
        </span>
        <div>
          <h3>Pengumuman Operasional Hari Ini</h3>
          <p>
            Pastikan seluruh kru kebersihan sudah tiba di lokasi tepat 15 menit
            sebelum jam pengerjaan dan mengisi checklist SOP.
          </p>
        </div>
        <SopButton />
      </section>
      <div className="section-heading">
        <h2>Ringkasan Pesanan Hari Ini</h2>
        <small>
          Diperbarui:{' '}
          {new Intl.DateTimeFormat('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Jakarta',
          }).format(now)}{' '}
          WIB
        </small>
      </div>
      <div className="metrics-grid">
        <MetricCard
          label="TOTAL PESANAN HARI INI"
          value={dailyOrders.length}
          unit="Order"
          note="Pesanan terdaftar hari ini"
          icon="orders"
        />
        <MetricCard
          label="SEDANG DIKERJAKAN"
          value={counts('Sedang Dikerjakan')}
          unit="Lokasi"
          note="Kru aktif di lapangan"
          icon="working"
          tone="blue"
        />
        <MetricCard
          label="MENUNGGU ASSIGN"
          value={counts('Menunggu Assign')}
          unit="Order"
          note="Perlu tindakan segera"
          icon="clock"
          tone="amber"
        />
        <MetricCard
          label="SELESAI HARI INI"
          value={counts('Selesai')}
          unit="Selesai"
          note="Pengerjaan telah selesai"
          icon="check"
        />
      </div>
      <div className="section-heading">
        <h2>Ringkasan Aktivitas Pesanan Terbaru</h2>
        <Link href="/pesanan" className="text-link">
          Lihat Semua di Kelola Pesanan <Icon name="arrow" />
        </Link>
      </div>
      <div className="activity-list">
        {orders.slice(0, 3).map((order) => (
          <Link
            href={'/pesanan/' + encodeURIComponent(order.id)}
            className="activity-card"
            key={order.id}
          >
            <span className="activity-icon">
              <Icon
                name={
                  order.service.toLowerCase().includes('kantor')
                    ? 'working'
                    : 'services'
                }
              />
            </span>
            <div className="activity-copy">
              <small>
                #{order.id} · {order.address}
              </small>
              <h3>{order.service}</h3>
              <p className="activity-meta">
                <span>
                  Petugas: {order.staff.join(' & ') || 'Belum Ditugaskan'}
                </span>
                <span>
                  <Icon name="clock" />
                  {order.time}
                </span>
              </p>
            </div>
            <span className={'status-badge ' + tone(order.status)}>
              <i />
              {order.status}
            </span>
            <Icon name="chevron" />
          </Link>
        ))}
        {!orders.length && (
          <div className="empty-state">
            <h3>Belum ada pesanan</h3>
            <p>Tambahkan pesanan pertama untuk mulai mengelola operasional.</p>
            <Link href="/pesanan/new" className="button primary">
              Tambah pesanan
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
