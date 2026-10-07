import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Link } from "@tanstack/react-router";
import { type IconName, Icon } from "./Icon";
import { type Order } from "../data/orders";

type Filter = "Semua" | "Perlu tindakan" | "Pembaruan";
const filters: Filter[] = ["Semua", "Perlu tindakan", "Pembaruan"];

function notificationFor(order: Order): {
  title: string;
  description: string;
  icon: IconName;
  attention: boolean;
} {
  switch (order.status) {
    case "Menunggu Assign":
      return {
        title: "Pesanan perlu petugas",
        description: `#${order.id} · ${order.service} untuk ${order.customer} belum memiliki petugas.`,
        icon: "clock",
        attention: true,
      };
    case "Menunggu Lokasi":
      return {
        title: "Lokasi perlu dikonfirmasi",
        description: `#${order.id} · Pastikan titik lokasi ${order.customer} sebelum jadwal dimulai.`,
        icon: "calendar",
        attention: true,
      };
    case "Sedang Dikerjakan":
      return {
        title: "Pekerjaan sedang berlangsung",
        description: `#${order.id} · ${order.staff.join(" & ")} sedang menangani ${order.service}.`,
        icon: "working",
        attention: false,
      };
    case "Selesai":
      return {
        title: "Pesanan selesai",
        description: `#${order.id} · Pekerjaan untuk ${order.customer} telah selesai.`,
        icon: "check",
        attention: false,
      };
  }
}

export function NotificationDialog({
  open,
  orders,
  readIds,
  setReadIds,
  onClose,
}: {
  open: boolean;
  orders: Order[];
  readIds: string[];
  setReadIds: Dispatch<SetStateAction<string[]>>;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("Semua");
  const notifications = useMemo(
    () => orders.map((order) => ({ order, ...notificationFor(order) })),
    [orders],
  );
  const visible = notifications.filter(
    (item) =>
      filter === "Semua" ||
      (filter === "Perlu tindakan" ? item.attention : !item.attention),
  );
  const unreadCount = notifications.filter(
    (item) => !readIds.includes(item.order.id),
  ).length;
  return (
    <div
      className="notification-popover"
      id="notification-popover"
      data-open={open}
      aria-hidden={!open}
      inert={!open}
      role="dialog"
      aria-labelledby="notification-title"
    >
      <div className="modal-header">
        <div>
          <h2 id="notification-title">Notifikasi</h2>
          <p>{unreadCount} belum dibaca · 18 September 2026</p>
        </div>
        <button
          className="close-button"
          aria-label="Tutup notifikasi"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className="notification-toolbar">
        <div
          className="dialog-tabs"
          role="tablist"
          aria-label="Jenis notifikasi"
        >
          {filters.map((item) => (
            <button
              key={item}
              role="tab"
              aria-selected={filter === item}
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          className="quiet-action"
          disabled={unreadCount === 0}
          onClick={() => setReadIds(notifications.map((item) => item.order.id))}
        >
          Tandai dibaca
        </button>
      </div>
      <div className="notification-list" role="tabpanel">
        {visible.map((item) => {
          const unread = !readIds.includes(item.order.id);
          return (
            <Link
              to="/pesanan"
              search={{ order: item.order.id }}
              key={item.order.id}
              className={`notification-row ${unread ? "unread" : ""}`}
              onClick={() => {
                setReadIds((ids) =>
                  ids.includes(item.order.id) ? ids : [...ids, item.order.id],
                );
                onClose();
              }}
            >
              <span
                className={`notification-symbol ${item.attention ? "attention" : ""}`}
              >
                <Icon name={item.icon} />
              </span>
              <span className="notification-copy">
                <span className="notification-row-title">
                  {item.title}
                  <small>{item.order.time}</small>
                </span>
                <span>{item.description}</span>
                <em>
                  Lihat pesanan <span aria-hidden="true">↗</span>
                </em>
              </span>
              {unread && (
                <i className="notification-unread" aria-label="Belum dibaca" />
              )}
            </Link>
          );
        })}
        {visible.length === 0 && (
          <div className="notification-empty">
            Belum ada notifikasi di kategori ini.
          </div>
        )}
      </div>
      <div className="modal-footer notification-footer">
        <span>Aktivitas terbaru dari pesanan demo</span>
        <button className="button" onClick={onClose}>
          Tutup
        </button>
      </div>
    </div>
  );
}
