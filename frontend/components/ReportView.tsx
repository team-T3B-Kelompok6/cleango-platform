import Link from 'next/link';
import { list } from '@/lib/api';
import { rupiah } from '@/lib/resources';
import type { Order, Search } from '@/types';
import { MetricCard } from './MetricCard';
import { DialogTrigger } from './DialogTrigger';
import { Icon } from './Icon';
import { UiIcon } from './UiIcon';

const tabs = [
  'Ringkasan Bulanan',
  'Laporan Harian',
  'Laporan Per Pelanggan',
  'Laporan Performa Kru',
];
export async function ReportView({ params }: { params: Search }) {
  const orders = await list<Order>('orders');
  const month =
    typeof params.month === 'string' &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month)
      ? params.month
      : '';
  const tab =
    typeof params.tab === 'string' && tabs.includes(params.tab)
      ? params.tab
      : tabs[0];
  const visible = orders.filter(
    (order) =>
      (!month || order.date.startsWith(month)) && order.status === 'Selesai',
  );
  const total = visible.reduce((sum, order) => sum + order.price, 0);
  const weeks = [0, 0, 0, 0];
  const payments = new Map<string, number>();
  for (const order of visible) {
    weeks[Math.min(3, Math.floor((Number(order.date.slice(-2)) - 1) / 7))] +=
      order.price;
    if (order.paymentMethod)
      payments.set(
        order.paymentMethod,
        (payments.get(order.paymentMethod) ?? 0) + 1,
      );
  }
  const grouped = new Map<string, { count: number; amount: number }>();
  if (tab !== tabs[0])
    for (const order of visible) {
      const keys =
        tab === tabs[1]
          ? [order.date]
          : tab === tabs[2]
            ? [order.customer]
            : order.staff;
      for (const key of keys) {
        const value = grouped.get(key) ?? { count: 0, amount: 0 };
        grouped.set(key, {
          count: value.count + 1,
          amount: value.amount + order.price,
        });
      }
    }
  const monthLabel = month
    ? 'Bulan ' +
      new Date(month + '-01T00:00:00+07:00').toLocaleDateString('id-ID', {
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      })
    : 'Semua Periode';
  return (
    <div className="report-page">
      <div className="page-title admin-heading">
        <div>
          <h1>Laporan Keuangan &amp; Operasional</h1>
          <p>
            Pantau ringkasan pendapatan, pelanggan, dan riwayat transaksi order.
          </p>
        </div>
        <div className="admin-heading-actions">
          <button className="button" popoverTarget="report-period">
            <Icon name="calendar" />
            {monthLabel}
          </button>
          <div
            id="report-period"
            popover="auto"
            className="account-popover report-period"
          >
            <form action="/laporan">
              <input type="hidden" name="tab" value={tab} />
              <label>
                Bulan laporan
                <input name="month" type="month" defaultValue={month} />
              </label>
              <button className="button primary">Terapkan</button>{' '}
              <Link
                className="button"
                href={'/laporan?tab=' + encodeURIComponent(tab)}
              >
                Semua periode
              </Link>
            </form>
          </div>
          <a
            className="button primary"
            href={'/laporan/export' + (month ? '?month=' + month : '')}
          >
            <UiIcon name="download" />
            Unduh Laporan CSV
          </a>
        </div>
      </div>
      <div className="metrics-grid order-metrics finance-metrics">
        <MetricCard
          label="TOTAL PENDAPATAN"
          value={rupiah(total)}
          note="Pesanan selesai dalam periode"
          icon="services"
          uiIcon="wallet"
        />
        <MetricCard
          label="PELANGGAN AKTIF"
          value={new Set(visible.map((order) => order.customer)).size}
          unit="Customer"
          note="Pelanggan dengan pesanan selesai"
          icon="customers"
          tone="blue"
        />
        <MetricCard
          label="ORDER BERHASIL"
          value={visible.length}
          unit="Order"
          note="Pesanan selesai dalam periode"
          icon="orders"
          tone="amber"
        />
      </div>
      <div className="report-panels">
        <section className="admin-panel">
          <h2>Tren Pendapatan Mingguan</h2>
          <p className="finance-chart-caption">
            Akumulasi pesanan selesai{' '}
            {month
              ? 'pada bulan terpilih'
              : 'dari seluruh periode, dikelompokkan menurut minggu dalam bulan'}
          </p>
          <div
            className="finance-chart"
            role="img"
            aria-label={weeks
              .map((sum, index) => 'Minggu ' + (index + 1) + ': ' + rupiah(sum))
              .join(', ')}
          >
            {weeks.map((sum, index) => (
              <div className="finance-bar-column" key={index}>
                <div className="finance-bar-space">
                  <div
                    className="finance-bar"
                    style={{
                      height:
                        Math.max(
                          2,
                          Math.round((sum / Math.max(1, ...weeks)) * 90),
                        ) + '%',
                    }}
                  >
                    <small>{rupiah(sum)}</small>
                    <i />
                    <b />
                  </div>
                </div>
                <span>Minggu {index + 1}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="admin-panel">
          <h2>Ringkasan Metode Pembayaran</h2>
          {payments.size ? (
            <div className="payment-list">
              {Array.from(payments).map(([name, count]) => (
                <div key={name}>
                  <label htmlFor={'payment-' + encodeURIComponent(name)}>
                    {name}
                    <strong>
                      {Math.round((count / Math.max(1, visible.length)) * 100)}%
                    </strong>
                  </label>
                  <progress
                    id={'payment-' + encodeURIComponent(name)}
                    value={count}
                    max={visible.length}
                  />
                </div>
              ))}
              {visible.filter((order) => !order.paymentMethod).length > 0 && (
                <p className="report-payment-empty">
                  {visible.filter((order) => !order.paymentMethod).length}{' '}
                  pesanan belum mencantumkan metode pembayaran.
                </p>
              )}
            </div>
          ) : (
            <p className="report-payment-empty">
              Metode pembayaran belum tersedia. Ringkasan akan tampil setelah
              informasi pembayaran diterima dari API.
            </p>
          )}
        </section>
      </div>
      <nav className="order-tabs report-tabs" aria-label="Jenis laporan">
        {tabs.map((label) => (
          <Link
            key={label}
            aria-current={tab === label ? 'page' : undefined}
            href={
              '/laporan?' +
              new URLSearchParams({ ...(month ? { month } : {}), tab: label })
            }
            scroll={false}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="figma-list report-details" key={tab}>
        {tab === tabs[0]
          ? visible.map((order) => (
              <article key={order.id} className="finance-order-row">
                <div>
                  <small>
                    #{order.invoiceId || order.id} · {order.date}
                  </small>
                  <h3>{order.customer}</h3>
                  <p>
                    {order.service}
                    {order.paymentMethod &&
                      ' · Pembayaran: ' + order.paymentMethod}
                  </p>
                </div>
                <strong>{rupiah(order.price)}</strong>
                <DialogTrigger
                  label="Lihat Rincian"
                  title="Rincian Pesanan Selesai"
                  subtitle={'#' + order.id}
                >
                  <div className="modal-body invoice-detail">
                    <h3>{order.customer}</h3>
                    <p>{order.address}</p>
                    <div className="invoice-line">
                      <span>{order.service}</span>
                      <strong>{rupiah(order.price)}</strong>
                    </div>
                    <small>
                      {order.paymentMethod
                        ? 'Metode pembayaran: ' + order.paymentMethod
                        : 'Informasi pembayaran belum tersedia.'}
                    </small>
                    <Link
                      className="button"
                      href={'/pesanan/' + encodeURIComponent(order.id)}
                    >
                      Detail pesanan
                    </Link>
                  </div>
                </DialogTrigger>
              </article>
            ))
          : Array.from(grouped).map(([name, data]) => (
              <article key={name} className="finance-order-row">
                <div>
                  <h3>{name}</h3>
                  <p>
                    {data.count} pesanan selesai
                    {tab === tabs[3]
                      ? ' · Nilai pesanan yang ditangani, bukan gaji petugas'
                      : ''}
                  </p>
                </div>
                <strong>{rupiah(data.amount)}</strong>
              </article>
            ))}
        {(!visible.length || (tab !== tabs[0] && !grouped.size)) && (
          <div className="empty-state">
            <h3>Belum ada transaksi selesai pada periode ini</h3>
            <p>Pilih periode lainnya.</p>
          </div>
        )}
      </div>
    </div>
  );
}
