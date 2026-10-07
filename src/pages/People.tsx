import { UiIcon } from "../components/UiIcon";
import { useState, type FormEvent } from "react";
import {
  AdminBadge,
  AdminEmpty,
  AdminHeading,
  ActionButton,
  containsSearch,
} from "../components/AdminUi";
import { MetricCard, Modal } from "../components/ui";
import { nextId, type Customer, type Staff } from "../data/admin";
import { useDemo } from "../data/store";

const blankStaff: Staff = {
  id: "",
  name: "",
  area: "",
  phone: "",
  status: "Tersedia",
};
const blankCustomer: Customer = {
  id: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  joined: "2026-09-18",
  active: true,
};

export function StaffPage() {
  const { staff, setStaff, search } = useDemo();
  const [status, setStatus] = useState("Semua Petugas");
  const [editing, setEditing] = useState<Staff | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const visible = staff.filter(
    (person) =>
      (status === "Semua Petugas" ||
        (status === "Siaga & Tersedia" && person.status === "Tersedia") ||
        (status === "Sedang Bekerja" && person.status === "Bertugas") ||
        (status === "Masa Training" && person.status === "Nonaktif")) &&
      containsSearch(search, person.name, person.area, person.phone),
  );
  const save = (person: Staff) => {
    setStaff((current) =>
      editing
        ? current.map((item) => (item.id === editing.id ? person : item))
        : [...current, { ...person, id: nextId("PT") }],
    );
    setFormOpen(false);
  };
  return (
    <>
      <AdminHeading
        title="Kelola Data Petugas"
        description="Daftar, izin, sertifikasi, kesiapan, area tugas, keunggulan kerja, kontak, dan riwayat penugasan."
        action={
          <ActionButton
            icon="staff"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Tambah Petugas Baru
          </ActionButton>
        }
      />
      <div className="metrics-grid admin-metrics">
        <MetricCard
          label="TOTAL PETUGAS AKTIF"
          value={12 + staff.length - 5}
          note="Tersebar dalam 3 shift wilayah"
          icon="staff"
        />
        <MetricCard
          label="SIAGA & TERSEDIA"
          value={
            8 + staff.filter((item) => item.status === "Tersedia").length - 3
          }
          note="Siap ditugaskan untuk order baru"
          icon="clock"
          tone="blue"
        />
        <MetricCard
          label="PETUGAS LIBUR"
          value={4 + staff.filter((item) => item.status === "Nonaktif").length}
          note="Sedang libur / sedang di lokasi"
          icon="staff"
          tone="amber"
        />
      </div>
      <div className="figma-manage-section">
        <div
          className="order-tabs manage-tabs"
          role="group"
          aria-label="Filter petugas"
        >
          {[
            "Semua Petugas",
            "Siaga & Tersedia",
            "Sedang Bekerja",
            "Masa Training",
          ].map((item) => (
            <button
              key={item}
              className={status === item ? "selected" : ""}
              aria-pressed={status === item}
              onClick={() => setStatus(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="figma-list">
          {visible.map((person) => (
            <article className="figma-person-row" key={person.id}>
              <div className="figma-person-main">
                <div className="figma-person-meta">
                  <span>#{person.id}</span>
                  <AdminBadge
                    tone={
                      person.status === "Tersedia"
                        ? "green"
                        : person.status === "Bertugas"
                          ? "blue"
                          : "amber"
                    }
                  >
                    {person.status === "Tersedia"
                      ? "Siaga & Tersedia"
                      : person.status === "Bertugas"
                        ? "Sedang Bekerja"
                        : "Masa Training"}
                  </AdminBadge>
                </div>
                <h3>
                  {person.name} <small>★ 4.9</small>
                </h3>
                <p>
                  WhatsApp: {person.phone} · Wilayah: {person.area}
                </p>
                <div className="figma-feature-list">
                  <span>✓ Deep Cleaning</span>
                  <span>✓ Bersih Menyeluruh</span>
                  <span>✓ SOP Ramah Lingkungan</span>
                </div>
              </div>
              <div className="figma-person-actions">
                <button
                  className="text-action"
                  onClick={() => {
                    setEditing(person);
                    setFormOpen(true);
                  }}
                >
                  <UiIcon name="edit" /> Edit Petugas
                </button>
                <button
                  onClick={() => {
                    setEditing(person);
                    setFormOpen(true);
                  }}
                >
                  Lihat Detail &amp; Jadwal
                </button>
              </div>
            </article>
          ))}
        </div>
        {visible.length === 0 && <AdminEmpty />}
      </div>
      {formOpen && (
        <StaffForm
          key={editing?.id ?? "new"}
          initial={editing ?? blankStaff}
          onClose={() => setFormOpen(false)}
          onSave={save}
        />
      )}
    </>
  );
}

function StaffForm({
  initial,
  onClose,
  onSave,
}: {
  initial: Staff;
  onClose: () => void;
  onSave: (person: Staff) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      ...draft,
      name: draft.name.trim(),
      area: draft.area.trim(),
      phone: draft.phone.trim(),
    });
  };
  return (
    <Modal
      title={initial.id ? "Ubah petugas" : "Tambah petugas"}
      subtitle="Profil tim lapangan demo"
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="modal-body manage-form">
          <div className="form-grid">
            <label className="full-width">
              Nama petugas
              <input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label>
              Area kerja
              <input
                required
                value={draft.area}
                onChange={(e) => setDraft({ ...draft, area: e.target.value })}
              />
            </label>
            <label>
              Nomor kontak
              <input
                required
                type="tel"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              />
            </label>
            <label className="full-width">
              Status
              <select
                value={draft.status}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    status: e.target.value as Staff["status"],
                  })
                }
              >
                <option>Tersedia</option>
                <option>Bertugas</option>
                <option>Nonaktif</option>
              </select>
            </label>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="button" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="button primary">
            Simpan petugas
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function CustomersPage() {
  const { customers, setCustomers, orders, search } = useDemo();
  const [editing, setEditing] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const visible = customers.filter((person) =>
    containsSearch(
      search,
      person.name,
      person.email,
      person.phone,
      person.address,
    ),
  );
  const save = (person: Customer) => {
    setCustomers((current) =>
      editing
        ? current.map((item) => (item.id === editing.id ? person : item))
        : [...current, { ...person, id: nextId("CS") }],
    );
    setFormOpen(false);
  };
  return (
    <>
      <AdminHeading
        title="Kelola Data Customer"
        description="Daftar pelanggan aktif, tipe keanggotaan, riwayat pemesanan, dan status akun."
        action={
          <ActionButton
            icon="customers"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Tambah Customer Baru
          </ActionButton>
        }
      />
      <div className="metrics-grid admin-metrics">
        <MetricCard
          label="TOTAL CUSTOMER TERDAFTAR"
          value={148 + customers.length - 4}
          note="Member aktif bulan ini"
          icon="customers"
        />
        <MetricCard
          label="ORDER BERULANG (REPEAT)"
          value="82%"
          note="Tingkat kepuasan 4 minggu terakhir"
          icon="working"
          tone="blue"
        />
        <MetricCard
          label="ORDER BERULANG (REPEAT)"
          value="82%"
          note="Tingkat kepuasan 4 minggu terakhir"
          icon="working"
          tone="amber"
        />
      </div>
      <div className="figma-manage-section">
        <div className="customer-list">
          {visible.map((person) => (
            <article
              className="customer-row figma-customer-row"
              key={person.id}
            >
              <div className="customer-main">
                <small>
                  #{person.id} · Terdaftar sejak {person.joined}
                </small>
                <h3>{person.name}</h3>
                <p>
                  WhatsApp: {person.phone} · {person.email}
                </p>
                <div className="figma-feature-list">
                  <span>
                    {
                      orders.filter((order) => order.customer === person.name)
                        .length
                    }{" "}
                    Pesanan
                  </span>
                  <span>Sejak {person.joined.slice(0, 4)}</span>
                  <span>{person.active ? "Akun Aktif" : "Akun Nonaktif"}</span>
                </div>
              </div>
              <div className="customer-end">
                <a
                  className="button"
                  href={`https://wa.me/${person.phone.replace(/\D/g, "").replace(/^0/, "62")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Hubungi WhatsApp
                </a>
                <button
                  className="button primary"
                  onClick={() => {
                    setEditing(person);
                    setFormOpen(true);
                  }}
                >
                  Lihat Detail
                </button>
              </div>
            </article>
          ))}
        </div>
        {visible.length === 0 && <AdminEmpty />}
      </div>
      {formOpen && (
        <CustomerForm
          key={editing?.id ?? "new"}
          initial={editing ?? blankCustomer}
          onClose={() => setFormOpen(false)}
          onSave={save}
        />
      )}
    </>
  );
}

function CustomerForm({
  initial,
  onClose,
  onSave,
}: {
  initial: Customer;
  onClose: () => void;
  onSave: (person: Customer) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      ...draft,
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      address: draft.address.trim(),
    });
  };
  return (
    <Modal
      title={initial.id ? "Ubah customer" : "Tambah customer"}
      subtitle="Profil pelanggan demo"
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="modal-body manage-form">
          <div className="form-grid">
            <label className="full-width">
              Nama customer
              <input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label>
              Nomor kontak
              <input
                required
                type="tel"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </label>
            <label className="full-width">
              Alamat
              <textarea
                required
                rows={2}
                value={draft.address}
                onChange={(e) =>
                  setDraft({ ...draft, address: e.target.value })
                }
              />
            </label>
            <label>
              Tanggal bergabung
              <input
                required
                type="date"
                value={draft.joined}
                onChange={(e) => setDraft({ ...draft, joined: e.target.value })}
              />
            </label>
            <label>
              Status
              <select
                value={draft.active ? "Aktif" : "Nonaktif"}
                onChange={(e) =>
                  setDraft({ ...draft, active: e.target.value === "Aktif" })
                }
              >
                <option>Aktif</option>
                <option>Nonaktif</option>
              </select>
            </label>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="button" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="button primary">
            Simpan customer
          </button>
        </div>
      </form>
    </Modal>
  );
}
