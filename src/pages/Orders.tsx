import { UiIcon } from "../components/UiIcon";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Icon } from "../components/Icon";
import { MetricCard, Modal, StatusBadge } from "../components/ui";
import { useOutsideDismiss } from "../components/useOutsideDismiss";
import {
  demoDate,
  formatRupiah,
  initialOrders,
  type Order,
  type OrderStatus,
} from "../data/orders";
import { useDemo } from "../data/store";

const tabs = [
  "Semua Pesanan",
  "Menunggu Assign",
  "Sedang Dikerjakan",
  "Selesai",
] as const;
const columns: ColumnDef<Order>[] = [
  { accessorKey: "id" },
  { accessorKey: "customer" },
  { accessorKey: "address" },
  { accessorKey: "service" },
  { id: "staff", accessorFn: (order) => order.staff.join(" ") },
];

export function Orders() {
  const { orders, search, setSearch, updateOrder, staff } = useDemo();
  const [activeTab, setActiveTab] = useState<string>("Semua Pesanan");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [filterOpen, setFilterOpen] = useState(false);
  const dateFilterAnchor = useRef<HTMLDivElement>(null);
  useOutsideDismiss(dateFilterAnchor, filterOpen, () => setFilterOpen(false));
  const [assignId, setAssignId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const selected = useSearch({ from: "/pesanan" }).order;
  const navigate = useNavigate({ from: "/pesanan" });
  const selectedOrder = orders.find((order) => order.id === selected);
  const assignOrder = orders.find((order) => order.id === assignId);
  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          (activeTab === "Semua Pesanan" || order.status === activeTab) &&
          (!dateRange.from || order.date >= dateRange.from) &&
          (!dateRange.to || order.date <= dateRange.to),
      ),
    [orders, activeTab, dateRange],
  );
  const table = useReactTable({
    data: filteredOrders,
    columns,
    state: { globalFilter: search },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: "includesString",
  });
  const needAction = orders.filter(
    (order) =>
      order.status === "Menunggu Assign" || order.status === "Menunggu Lokasi",
  ).length;
  const finished =
    13 +
    orders.filter((order) => order.status === "Selesai").length -
    initialOrders.filter((order) => order.status === "Selesai").length;
  const activeStaff =
    8 +
    new Set(
      orders
        .filter((order) => order.status === "Sedang Dikerjakan")
        .flatMap((order) => order.staff),
    ).size -
    2;
  const closeDetail = () => void navigate({ search: {}, replace: true });
  const save = (updated: Order) => {
    updateOrder(updated);
    setAssignId(null);
    closeDetail();
    setMessage(`Pesanan #${updated.id} berhasil diperbarui.`);
  };
  const resetFilters = () => {
    setSearch("");
    setActiveTab("Semua Pesanan");
    setDateRange({ from: "", to: "" });
  };

  return (
    <>
      <div className="page-title order-title">
        <div>
          <h1>Kelola Pesanan</h1>
          <p>
            Kelola daftar order masuk, tentukan cleaner terpilih, dan pantau
            progres pengerjaan.
          </p>
        </div>
        <div className="date-filter-anchor" ref={dateFilterAnchor}>
          <button
            className={`button date-filter ${dateRange.from || dateRange.to ? "filter-active" : ""}`}
            aria-haspopup="dialog"
            aria-expanded={filterOpen}
            aria-controls="date-filter-popover"
            onClick={() => setFilterOpen((open) => !open)}
          >
            <Icon name="calendar" />
            Filter Tanggal
          </button>
          <DateFilter
            open={filterOpen}
            value={dateRange}
            onClose={() => setFilterOpen(false)}
            onApply={(range) => {
              setDateRange(range);
              setFilterOpen(false);
            }}
          />
        </div>
      </div>
      <div className="metrics-grid order-metrics">
        <MetricCard
          label="PERLU TINDAKAN (UNASSIGNED)"
          value={needAction}
          note="Harus segera di-assign"
          icon="clock"
          tone="amber"
        />
        <MetricCard
          label="KRU LAPANGAN AKTIF"
          value={activeStaff}
          note="Dari total 12 petugas"
          icon="working"
          tone="blue"
        />
        <MetricCard
          label="TUNTAS HARI INI"
          value={finished}
          note="100% SOP terpenuhi"
          icon="check"
        />
      </div>
      <div
        className="order-tabs"
        role="group"
        aria-label="Filter status pesanan"
      >
        {tabs.map((tab) => (
          <button
            aria-pressed={activeTab === tab}
            className={activeTab === tab ? "selected" : ""}
            key={tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      {(dateRange.from || dateRange.to) && (
        <div className="filter-summary">
          <span>
            Periode: {dateRange.from || "Awal"} — {dateRange.to || "Akhir"}
          </span>
          <button onClick={() => setDateRange({ from: "", to: "" })}>
            Hapus filter ×
          </button>
        </div>
      )}
      {message && (
        <div role="status" className="success-message">
          <Icon name="check" />
          <span>{message}</span>
          <button
            onClick={() => setMessage("")}
            aria-label="Tutup pemberitahuan"
          >
            ×
          </button>
        </div>
      )}
      <div
        className="order-list"
        key={`${activeTab}-${dateRange.from}-${dateRange.to}`}
        aria-live="polite"
      >
        {table.getRowModel().rows.map(({ original: order }) => (
          <article
            className={`order-card ${order.status === "Menunggu Assign" || order.status === "Menunggu Lokasi" ? "needs-action" : ""}`}
            key={order.id}
          >
            <div className="order-card-top">
              <strong>#{order.id}</strong>
              <StatusBadge status={order.status} />
              <span className="order-time">◷ {order.time}</span>
            </div>
            <h3>{order.customer}</h3>
            <div className="order-info">
              <span className="order-address">
                <UiIcon name="pin" />
                {order.address}
              </span>
              <span>{order.service}</span>
              <strong>{formatRupiah(order.price)}</strong>
            </div>
            <div className="order-card-bottom">
              <p>
                Petugas:{" "}
                <span className={order.staff.length ? "" : "unassigned"}>
                  {order.staff.join(" & ") || "Belum Ditugaskan"}
                </span>
              </p>
              <div className="order-actions">
                {(order.status === "Menunggu Assign" ||
                  order.status === "Menunggu Lokasi") && (
                  <button
                    className="button primary assign-button"
                    onClick={() => setAssignId(order.id)}
                  >
                    <Icon name="staff" /> Tugaskan Petugas
                  </button>
                )}
                <button
                  className="button"
                  aria-label={`Detail & Ubah ${order.id}`}
                  onClick={() => void navigate({ search: { order: order.id } })}
                >
                  Detail &amp; Ubah
                </button>
              </div>
            </div>
          </article>
        ))}
        {table.getRowModel().rows.length === 0 && (
          <div className="empty-state">
            <h3>Tidak ada pesanan yang sesuai</h3>
            <p>Coba kata kunci, status, atau tanggal lainnya.</p>
            <button className="button" onClick={resetFilters}>
              Reset filter
            </button>
          </div>
        )}
      </div>
      {assignOrder && (
        <AssignDialog
          order={assignOrder}
          staffNames={staff
            .filter((person) => person.status !== "Nonaktif")
            .map((person) => person.name)}
          onClose={() => setAssignId(null)}
          onSave={save}
        />
      )}
      {selectedOrder && !assignOrder && (
        <OrderDialog
          key={selectedOrder.id}
          order={selectedOrder}
          staffNames={staff
            .filter((person) => person.status !== "Nonaktif")
            .map((person) => person.name)}
          onClose={closeDetail}
          onSave={save}
        />
      )}
      {selected && !selectedOrder && (
        <Modal title="Pesanan tidak ditemukan" onClose={closeDetail}>
          <div className="modal-body">
            <p>Pesanan #{selected} tidak tersedia dalam data demo.</p>
          </div>
          <div className="modal-footer">
            <button className="button" onClick={closeDetail}>
              Tutup
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function DateFilter({
  open,
  value,
  onClose,
  onApply,
}: {
  open: boolean;
  value: { from: string; to: string };
  onClose: () => void;
  onApply: (value: { from: string; to: string }) => void;
}) {
  const [range, setRange] = useState(value);
  useEffect(() => {
    if (open) setRange(value);
  }, [open, value]);
  const invalid = !!(range.from && range.to && range.to < range.from);
  return (
    <div
      className="date-popover"
      id="date-filter-popover"
      data-open={open}
      aria-hidden={!open}
      inert={!open}
      role="dialog"
      aria-labelledby="date-filter-title"
    >
      <div className="modal-header">
        <div>
          <h2 id="date-filter-title">Filter tanggal</h2>
          <p>Pilih rentang tanggal pesanan</p>
        </div>
        <button
          className="close-button"
          aria-label="Tutup filter tanggal"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!invalid) onApply(range);
        }}
      >
        <div className="modal-body">
          <div className="form-grid">
            <label>
              Dari tanggal
              <input
                type="date"
                value={range.from}
                onInput={(event) =>
                  setRange({ ...range, from: event.currentTarget.value })
                }
              />
            </label>
            <label>
              Sampai tanggal
              <input
                type="date"
                min={range.from || undefined}
                value={range.to}
                onInput={(event) =>
                  setRange({ ...range, to: event.currentTarget.value })
                }
              />
            </label>
          </div>
          {invalid && (
            <p className="form-error" role="alert">
              Tanggal akhir harus sama atau setelah tanggal awal.
            </p>
          )}
          <div className="date-shortcuts">
            <button
              type="button"
              className="button"
              onClick={() => setRange({ from: demoDate, to: demoDate })}
            >
              Hari demo · 18 Sep 2026
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setRange({ from: "", to: "" })}
            >
              Semua tanggal
            </button>
          </div>
          <p className="muted">
            Data dummy menggunakan tanggal 18 September 2026.
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="button" onClick={onClose}>
            Batal
          </button>
          <button className="button primary" type="submit" disabled={invalid}>
            Terapkan filter
          </button>
        </div>
      </form>
    </div>
  );
}

function AssignDialog({
  order,
  staffNames,
  onClose,
  onSave,
}: {
  order: Order;
  staffNames: string[];
  onClose: () => void;
  onSave: (order: Order) => void;
}) {
  const [staff, setStaff] = useState(order.staff);
  return (
    <Modal
      title="Tugaskan Petugas"
      subtitle={`#${order.id} · ${order.customer}`}
      onClose={onClose}
      className="order-form-dialog"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (staff.length)
            onSave({ ...order, staff, status: "Sedang Dikerjakan" });
        }}
      >
        <div className="modal-body">
          <div className="info-banner">
            <strong>{order.service}</strong>
            <p>
              {order.address} · {order.time}
            </p>
          </div>
          <fieldset className="staff-fieldset">
            <legend>Pilih petugas kebersihan</legend>
            {staffNames.map((name, index) => (
              <label
                className={`staff-option ${staff.includes(name) ? "checked" : ""}`}
                key={name}
              >
                <input
                  type="checkbox"
                  checked={staff.includes(name)}
                  onChange={(event) =>
                    setStaff((current) =>
                      event.target.checked
                        ? [...current, name]
                        : current.filter((value) => value !== name),
                    )
                  }
                />
                <span className="staff-avatar">
                  {name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </span>
                <span>
                  <strong>{name}</strong>
                  <small>
                    Cleaner ·{" "}
                    {index < 2 ? "Tim Jakarta & Bekasi" : "Tim Jakarta"}
                  </small>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="muted">
            Simulasi: menyimpan penugasan akan mengubah status menjadi Sedang
            Dikerjakan.
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="button" onClick={onClose}>
            Batal
          </button>
          <button
            type="submit"
            className="button primary"
            disabled={!staff.length}
          >
            Simpan penugasan
          </button>
        </div>
      </form>
    </Modal>
  );
}

function OrderDialog({
  order,
  staffNames,
  onClose,
  onSave,
}: {
  order: Order;
  staffNames: string[];
  onClose: () => void;
  onSave: (order: Order) => void;
}) {
  const [draft, setDraft] = useState(order);
  const [error, setError] = useState("");
  const set = <K extends keyof Order>(key: K, value: Order[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (
      !draft.customer.trim() ||
      !draft.address.trim() ||
      !draft.service.trim() ||
      !draft.time.trim()
    ) {
      setError("Lengkapi nama pelanggan, alamat, layanan, dan jam pengerjaan.");
      return;
    }
    if (draft.status !== "Menunggu Assign" && draft.staff.length === 0) {
      setError("Pilih petugas sebelum mengubah status pengerjaan.");
      return;
    }
    onSave({
      ...draft,
      customer: draft.customer.trim(),
      address: draft.address.trim(),
      service: draft.service.trim(),
      staff: draft.status === "Menunggu Assign" ? [] : draft.staff,
    });
  };
  return (
    <Modal
      title="Detail & Ubah Pesanan"
      subtitle={`#${order.id} · Data dummy`}
      onClose={onClose}
      wide
      className="order-form-dialog"
    >
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="detail-summary">
            <StatusBadge status={order.status} />
            <strong>{formatRupiah(order.price)}</strong>
          </div>
          <div className="form-grid">
            <label>
              Nama pelanggan
              <input
                value={draft.customer}
                onChange={(event) => set("customer", event.target.value)}
                required
              />
            </label>
            <label>
              Layanan
              <input
                value={draft.service}
                onChange={(event) => set("service", event.target.value)}
                required
              />
            </label>
            <label className="full-width">
              Alamat pengerjaan
              <input
                value={draft.address}
                onChange={(event) => set("address", event.target.value)}
                required
              />
            </label>
            <label>
              Tanggal
              <input
                type="date"
                value={draft.date}
                onInput={(event) => set("date", event.currentTarget.value)}
                required
              />
            </label>
            <label>
              Jam pengerjaan
              <input
                value={draft.time}
                onChange={(event) => set("time", event.target.value)}
                required
              />
            </label>
            <label>
              Biaya (Rp)
              <input
                type="number"
                min="0"
                step="1000"
                value={draft.price}
                onChange={(event) => set("price", Number(event.target.value))}
                required
              />
            </label>
            <label>
              Status
              <select
                value={draft.status}
                onChange={(event) =>
                  set("status", event.target.value as OrderStatus)
                }
              >
                {[
                  "Menunggu Assign",
                  "Menunggu Lokasi",
                  "Sedang Dikerjakan",
                  "Selesai",
                ].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <fieldset className="full-width compact-staff">
              <legend>Petugas</legend>
              {staffNames.map((name) => (
                <label key={name}>
                  <input
                    type="checkbox"
                    checked={draft.staff.includes(name)}
                    onChange={(event) =>
                      set(
                        "staff",
                        event.target.checked
                          ? [...draft.staff, name]
                          : draft.staff.filter((value) => value !== name),
                      )
                    }
                  />
                  {name}
                </label>
              ))}
            </fieldset>
            <label className="full-width">
              Catatan
              <textarea
                rows={3}
                value={draft.notes}
                onChange={(event) => set("notes", event.target.value)}
              />
            </label>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <p className="muted form-hint">
            Perubahan hanya berlaku selama sesi demo dan akan direset saat
            halaman dimuat ulang.
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="button" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="button primary">
            Simpan perubahan
          </button>
        </div>
      </form>
    </Modal>
  );
}
