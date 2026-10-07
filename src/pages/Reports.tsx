import { useRef, useState } from "react";
import {
  AdminEmpty,
  AdminHeading,
  AdminPanel,
  containsSearch,
} from "../components/AdminUi";
import { MetricCard, Modal } from "../components/ui";
import { Icon } from "../components/Icon";
import { useOutsideDismiss } from "../components/useOutsideDismiss";
import { formatRupiah, type Order } from "../data/orders";
import { useDemo } from "../data/store";

const trend = [8400000, 10400000, 12400000, 14400000];
const methods = [
  { name: "QRIS Instan", value: 65 },
  { name: "Virtual Account", value: 20 },
  { name: "Invoice Kantor", value: 10 },
  { name: "Tunai Terbatas", value: 5 },
];
const tabs = [
  "Ringkasan Bulanan",
  "Laporan Harian",
  "Laporan Per Pelanggan",
  "Laporan Performa Kru",
];
function exportCsv(orders: Order[]) {
  const escape = (value: unknown) => `"${String(value).replaceAll('"', '""')}"`;
  const rows = [
    ["ID", "Tanggal", "Pelanggan", "Layanan", "Status", "Petugas", "Harga"],
    ...orders.map((order) => [
      order.id,
      order.date,
      order.customer,
      order.service,
      order.status,
      order.staff.join(" & "),
      order.price,
    ]),
  ];
  const csv =
    "\uFEFF" + rows.map((row) => row.map(escape).join(",")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "laporan-cleango-demo.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Reports() {
  const { orders, staff, search } = useDemo();
  const [month, setMonth] = useState("2026-09");
  const [monthDraft, setMonthDraft] = useState(month);
  const [monthOpen, setMonthOpen] = useState(false);
  const monthAnchor = useRef<HTMLDivElement>(null);
  useOutsideDismiss(monthAnchor, monthOpen, () => setMonthOpen(false));
  const [tab, setTab] = useState(tabs[0]);
  const [invoice, setInvoice] = useState<Order | null>(null);
  const visible = orders.filter(
    (order) =>
      order.date.startsWith(month) &&
      containsSearch(
        search,
        order.customer,
        order.service,
        order.status,
        order.id,
      ),
  );
  const demoMonth = month === "2026-09";
  const monthLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
  return (
    <>
      <AdminHeading
        title="Laporan Keuangan & Operasional"
        description="Pantau ringkasan pendapatan harian / bulanan, tren pertumbuhan pelanggan, dan riwayat transaksi order."
        action={
          <div className="admin-heading-actions">
            <div className="date-filter-anchor" ref={monthAnchor}>
              <button
                className="button"
                aria-expanded={monthOpen}
                aria-haspopup="dialog"
                onClick={() => {
                  setMonthDraft(month);
                  setMonthOpen((value) => !value);
                }}
              >
                <Icon name="calendar" />
                Bulan {monthLabel}
              </button>
              <div
                className="date-popover single-date-popover"
                data-open={monthOpen}
                aria-hidden={!monthOpen}
                inert={!monthOpen}
                role="dialog"
                aria-labelledby="report-month-title"
              >
                <div className="modal-header">
                  <div>
                    <h2 id="report-month-title">Periode laporan</h2>
                    <p>Pilih bulan yang ingin ditampilkan</p>
                  </div>
                  <button
                    className="close-button"
                    aria-label="Tutup periode laporan"
                    onClick={() => setMonthOpen(false)}
                  >
                    ×
                  </button>
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setMonth(monthDraft);
                    setMonthOpen(false);
                  }}
                >
                  <div className="modal-body form-grid">
                    <label>
                      Bulan
                      <input
                        type="month"
                        required
                        value={monthDraft}
                        onChange={(event) => setMonthDraft(event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="modal-footer">
                    <button className="button primary">Terapkan</button>
                  </div>
                </form>
              </div>
            </div>
            <button
              className="button primary admin-add"
              onClick={() => exportCsv(visible)}
            >
              <Icon name="logout" />
              Unduh Laporan
            </button>
          </div>
        }
      />
      <div className="metrics-grid admin-metrics finance-metrics">
        <MetricCard
          label="TOTAL PENDAPATAN BULAN INI"
          value={formatRupiah(
            demoMonth
              ? 48650000
              : visible.reduce((total, order) => total + order.price, 0),
          )}
          note="↗ 18,4% dari Agustus"
          icon="services"
        />
        <MetricCard
          label="PELANGGAN BARU & AKTIF"
          value={
            demoMonth
              ? 148
              : new Set(visible.map((order) => order.customer)).size
          }
          unit="Customer"
          note="64 pelanggan aktif berulang"
          icon="customers"
          tone="blue"
        />
        <MetricCard
          label="ORDER BERHASIL BULAN INI"
          value={
            demoMonth
              ? 186
              : visible.filter((order) => order.status === "Selesai").length
          }
          unit="Order"
          note="98% selesai sesuai jadwal"
          icon="orders"
          tone="amber"
        />
      </div>
      <div className="report-layout finance-layout">
        <AdminPanel
          title="Tren Pendapatan & Kunjungan Mingguan"
          aside={<span className="finance-growth">● +18,4% Naik</span>}
        >
          <p className="finance-chart-caption">
            Akumulasi transaksi dan target mingguan
          </p>
          <div
            className="finance-chart"
            role="img"
            aria-label="Pendapatan contoh: Minggu 1 8,4 juta, Minggu 2 10,4 juta, Minggu 3 12,4 juta, Minggu 4 14,4 juta rupiah"
          >
            {trend.map((value, index) => (
              <div className="finance-bar-column" key={index}>
                <div className="finance-bar-space">
                  <span
                    className="finance-bar"
                    style={{ height: `${demoMonth ? 45 + index * 13 : 0}%` }}
                  >
                    <small>{formatRupiah(demoMonth ? value : 0)}</small>
                    <i />
                    <b />
                  </span>
                </div>
                <span>Minggu {index + 1}</span>
              </div>
            ))}
          </div>
        </AdminPanel>
        <AdminPanel title="Ringkasan Metode Pembayaran">
          <div className="payment-methods">
            {methods.map((method) => (
              <div key={method.name}>
                <span>{method.name}</span>
                <strong>{demoMonth ? method.value : 0}%</strong>
                <i>
                  <b style={{ width: `${demoMonth ? method.value : 0}%` }} />
                </i>
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>
      <div className="figma-manage-section report-details">
        <div
          className="order-tabs manage-tabs"
          role="group"
          aria-label="Jenis laporan"
        >
          {tabs.map((item) => (
            <button
              key={item}
              className={tab === item ? "selected" : ""}
              aria-pressed={tab === item}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="figma-list report-rows" key={`${tab}-${month}`}>
          {(tab === tabs[0] || tab === tabs[1]) &&
            visible.map((order) => (
              <article className="finance-order-row" key={order.id}>
                <div>
                  <small>
                    #INV-{order.id} · Lunas · {order.date}
                  </small>
                  <h3>{order.customer}</h3>
                  <p>{order.service} · Pembayaran QRIS</p>
                </div>
                <strong>{formatRupiah(order.price)}</strong>
                <button className="button" onClick={() => setInvoice(order)}>
                  Lihat Invoice
                </button>
              </article>
            ))}
          {tab === tabs[2] &&
            [...new Set(visible.map((order) => order.customer))].map(
              (customer) => {
                const customerOrders = visible.filter(
                  (order) => order.customer === customer,
                );
                return (
                  <article className="finance-order-row" key={customer}>
                    <div>
                      <small>Ringkasan pelanggan · {monthLabel}</small>
                      <h3>{customer}</h3>
                      <p>
                        {customerOrders.length} pesanan ·{" "}
                        {
                          customerOrders.filter(
                            (order) => order.status === "Selesai",
                          ).length
                        }{" "}
                        selesai
                      </p>
                    </div>
                    <strong>
                      {formatRupiah(
                        customerOrders.reduce(
                          (total, order) => total + order.price,
                          0,
                        ),
                      )}
                    </strong>
                    <button
                      className="button"
                      onClick={() => setInvoice(customerOrders[0])}
                    >
                      Lihat Invoice
                    </button>
                  </article>
                );
              },
            )}
          {tab === tabs[3] &&
            staff
              .filter((person) =>
                containsSearch(search, person.name, person.area),
              )
              .map((person) => (
                <article className="finance-order-row" key={person.id}>
                  <div>
                    <small>
                      #{person.id} · {person.area}
                    </small>
                    <h3>{person.name}</h3>
                    <p>
                      {
                        visible.filter((order) =>
                          order.staff.includes(person.name),
                        ).length
                      }{" "}
                      penugasan · SOP kebersihan hijau
                    </p>
                  </div>
                  <strong className="staff-report-score">★ 4.9</strong>
                  <span className="finance-status">{person.status}</span>
                </article>
              ))}
          {visible.length === 0 && tab !== tabs[3] && (
            <AdminEmpty title="Belum ada transaksi pada periode ini" />
          )}
        </div>
      </div>
      {invoice && (
        <Modal
          title="Invoice Pesanan"
          subtitle={`#INV-${invoice.id} · ${invoice.date}`}
          onClose={() => setInvoice(null)}
        >
          <div className="modal-body invoice-detail">
            <span className="invoice-paid">✓ Pembayaran diterima</span>
            <h3>{invoice.customer}</h3>
            <p>{invoice.address}</p>
            <div className="invoice-line">
              <span>{invoice.service}</span>
              <strong>{formatRupiah(invoice.price)}</strong>
            </div>
            <div className="invoice-line invoice-total">
              <span>Total Pembayaran</span>
              <strong>{formatRupiah(invoice.price)}</strong>
            </div>
            <small>Metode pembayaran: QRIS Instan · Data demo Cleango</small>
          </div>
          <div className="modal-footer">
            <button className="button" onClick={() => setInvoice(null)}>
              Tutup
            </button>
            <button
              className="button primary"
              onClick={() => exportCsv([invoice])}
            >
              Unduh Invoice CSV
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
