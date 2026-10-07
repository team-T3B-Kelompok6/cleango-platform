import { useRef, useState } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Icon, type IconName } from "./Icon";
import { Modal } from "./ui";
import { NotificationDialog } from "./NotificationDialog";
import { useOutsideDismiss } from "./useOutsideDismiss";
import { useDemo } from "../data/store";
import { useAuth } from "../data/auth";

const menus: {
  label: string;
  icon: IconName;
  path: "/jadwal" | "/layanan" | "/faq" | "/petugas" | "/customer" | "/laporan";
}[] = [
  { label: "Kelola Jadwal", icon: "schedule", path: "/jadwal" },
  { label: "Kelola Layanan", icon: "services", path: "/layanan" },
  { label: "Kelola FAQ", icon: "faq", path: "/faq" },
  { label: "Kelola Data Customer", icon: "customers", path: "/customer" },
  { label: "Kelola Data Petugas", icon: "staff", path: "/petugas" },
  { label: "Laporan", icon: "report", path: "/laporan" },
];

export function Layout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isOrders = pathname === "/pesanan";
  const { search, setSearch, orders } = useDemo();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [dialog, setDialog] = useState<"notifications" | "profile" | null>(
    null,
  );
  const notificationAnchor = useRef<HTMLDivElement>(null);
  useOutsideDismiss(notificationAnchor, dialog === "notifications", () =>
    setDialog(null),
  );
  const title = isOrders
    ? "Kelola Pesanan"
    : (menus.find((item) => item.path === pathname)?.label ??
      "Dashboard Utama");
  const navigate = () => {
    setSearch("");
    setMobileOpen(false);
  };
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Lewati ke konten
      </a>
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Tutup navigasi"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${mobileOpen ? "open" : ""}`}
        aria-label="Navigasi utama"
      >
        <Link to="/" className="brand" onClick={navigate}>
          <span className="brand-symbol">
            <Icon name="brand" />
          </span>
          <span>
            <strong>
              cleango<span>•</span>
            </strong>
            <small>Layanan Kebersihan Jadi Mudah</small>
          </span>
        </Link>
        <nav>
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="nav-link dashboard-nav"
            onClick={navigate}
          >
            <Icon name="dashboard" />
            Dashboard Utama
          </Link>
          <Link to="/pesanan" className="nav-link" onClick={navigate}>
            <Icon name="package" />
            Kelola Pesanan
          </Link>
          {menus.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className="nav-link"
              onClick={navigate}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="eco-label">
            <Icon name="leaf" />
            <span>100% Ramah Lingkungan</span>
            <i />
          </div>
          <button className="nav-link logout" onClick={logout}>
            <Icon name="logout" />
            Keluar akun
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="header">
          <button
            className="mobile-toggle"
            aria-label="Buka navigasi"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            ☰
          </button>
          <label className="global-search">
            <Icon name="search" />
            <input
              aria-label={`Cari di ${title}`}
              placeholder={`Cari di ${title}...`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                aria-label="Hapus pencarian"
                onClick={() => setSearch("")}
              >
                ×
              </button>
            )}
          </label>
          <div className="header-right">
            <span className="header-date">
              <Icon name="calendar" />
              Jumat, 18 September 2026
            </span>
            <div className="notification-anchor" ref={notificationAnchor}>
              <button
                className="notification-button"
                aria-label="Lihat notifikasi"
                aria-haspopup="dialog"
                aria-expanded={dialog === "notifications"}
                aria-controls="notification-popover"
                onClick={() =>
                  setDialog((current) =>
                    current === "notifications" ? null : "notifications",
                  )
                }
              >
                <Icon name="bell" />
                {orders.some(
                  (order) => !readNotificationIds.includes(order.id),
                ) && <i />}
              </button>
              <NotificationDialog
                open={dialog === "notifications"}
                orders={orders}
                readIds={readNotificationIds}
                setReadIds={setReadNotificationIds}
                onClose={() => setDialog(null)}
              />
            </div>
            <button
              className="profile"
              onClick={() => setDialog("profile")}
              aria-label="Profil Admin Operasional"
            >
              <span className="avatar">🐼</span>
              <span className="profile-copy">
                <strong>Admin Operasional</strong>
                <small>SUPER ADMIN</small>
              </span>
              <Icon name="down" />
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="page-content" key={pathname}>
            <Outlet />
          </div>
        </main>
        <footer>
          <span>
            <Icon name="engine" />
            Cleango Dispatch Engine aktif — memantau seluruh jadwal otomatis
            tanpa henti.
          </span>
          <span>SOP Kebersihan Hijau Terpenuhi • Versi Sistem 2.4</span>
        </footer>
      </div>
      {dialog && dialog !== "notifications" && (
        <Modal title="Profil admin" onClose={() => setDialog(null)}>
          <div className="modal-body">
            <span className="profile-large">🐼</span>
            <h3>Admin Operasional</h3>
            <p>Super Admin · Cleango</p>
            <p className="muted">
              Akun demo untuk mengelola semua menu operasional.
            </p>
          </div>
          <div className="modal-footer">
            <button className="button" onClick={() => setDialog(null)}>
              Tutup
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
