import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Icon } from "../components/Icon";
import { MetricCard, StatusBadge } from "../components/ui";
import { useDemo } from "../data/store";
import { initialOrders, type OrderStatus } from "../data/orders";
import { SopDialog } from "../components/SopDialog";

export function Dashboard() {
  const { orders, search } = useDemo();
  const [sopOpen, setSopOpen] = useState(false);
  const recent = orders
    .slice(0, 3)
    .filter((order) =>
      `${order.id} ${order.service} ${order.address} ${order.customer} ${order.staff.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  const delta = (status: OrderStatus) =>
    orders.filter((order) => order.status === status).length -
    initialOrders.filter((order) => order.status === status).length;
  return (
    <>
      <div className="page-title">
        <div>
          <h1>
            Halo, Admin Cleango! <span className="wave">👋</span>
          </h1>
          <p>
            Berikut ringkasan operasional kebersihan hari ini, Jumat, 18
            September 2026.
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
        <button className="button sop-button" onClick={() => setSopOpen(true)}>
          Lihat SOP
        </button>
      </section>
      <div className="section-heading">
        <h2>Ringkasan Pesanan Hari Ini</h2>
        <small>Pembaruan terakhir: 12.45 WIB</small>
      </div>
      <div className="metrics-grid">
        <MetricCard
          label="TOTAL PESANAN HARI INI"
          value={24}
          unit="Order"
          note="↗ +12% dari kemarin"
          icon="orders"
        />
        <MetricCard
          label="SEDANG DIKERJAKAN"
          value={8 + delta("Sedang Dikerjakan")}
          unit="Lokasi"
          note="Kru Aktif di Lapangan"
          icon="working"
          tone="blue"
        />
        <MetricCard
          label="MENUNGGU ASSIGN"
          value={3 + delta("Menunggu Assign")}
          unit="Order"
          note="Perlu Tindakan Segera"
          icon="clock"
          tone="amber"
        />
        <MetricCard
          label="SELESAI HARI INI"
          value={13 + delta("Selesai")}
          unit="Selesai"
          note="Tingkat Kepuasan 99%"
          icon="check"
        />
      </div>
      <div className="section-heading activity-heading">
        <h2>Ringkasan Aktivitas Pesanan Terbaru</h2>
        <Link className="text-link" to="/pesanan">
          Lihat Semua di Kelola Pesanan
          <Icon name="arrow" />
        </Link>
      </div>
      <div className="activities">
        {recent.map((order) => (
          <Link
            to="/pesanan"
            search={{ order: order.id }}
            className="activity-card"
            key={order.id}
          >
            <span className="activity-emoji">{order.emoji}</span>
            <div className="activity-copy">
              <p>
                <b>#{order.id}</b> • {order.address}
              </p>
              <h3>{order.service}</h3>
              <div className="activity-meta">
                <span>
                  Petugas: {order.staff.join(" & ") || "Belum Ditugaskan"}
                </span>
                <span>◷ {order.time}</span>
              </div>
            </div>
            <StatusBadge status={order.status} />
            <Icon name="chevron" />
          </Link>
        ))}
        {recent.length === 0 && (
          <div className="empty-state">
            <h3>Pesanan tidak ditemukan</h3>
            <p>
              Coba kata kunci nama, ID pesanan, layanan, atau lokasi lainnya.
            </p>
          </div>
        )}
      </div>
      {sopOpen && <SopDialog onClose={() => setSopOpen(false)} />}
    </>
  );
}
