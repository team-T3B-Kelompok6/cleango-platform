import { UiIcon } from "../components/UiIcon";
import { useState, type FormEvent } from "react";
import {
  AdminEmpty,
  AdminHeading,
  ActionButton,
  containsSearch,
} from "../components/AdminUi";
import { MetricCard, Modal } from "../components/ui";
import { formatRupiah } from "../data/orders";
import { nextId, type Service } from "../data/admin";
import { useDemo } from "../data/store";

const blankService: Service = {
  id: "",
  name: "",
  category: "Rumah",
  duration: "2 jam",
  price: 0,
  description: "",
  active: true,
};

export function Services() {
  const { services, setServices, search } = useDemo();
  const [category, setCategory] = useState("Semua Layanan");
  const [editing, setEditing] = useState<Service | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const categories = ["Semua Layanan", "Rumah", "Kantor", "Sofa", "AC"];
  const visible = services.filter(
    (item) =>
      (category === "Semua Layanan" || item.category === category) &&
      containsSearch(search, item.name, item.category, item.description),
  );
  const save = (service: Service) => {
    setServices((current) =>
      editing
        ? current.map((item) => (item.id === editing.id ? service : item))
        : [...current, { ...service, id: nextId("LY") }],
    );
    setFormOpen(false);
  };
  return (
    <>
      <AdminHeading
        title="Kelola Layanan"
        description="Atur daftar paket kebersihan, harga dasar layanan, estimasi durasi pengerjaan, dan status ketersediaan."
        action={
          <ActionButton
            icon="services"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Tambah Layanan Baru
          </ActionButton>
        }
      />
      <div className="metrics-grid admin-metrics">
        <MetricCard
          label="TOTAL LAYANAN AKTIF"
          value={8 + services.filter((item) => item.active).length - 3}
          note="Terbagi dalam 4 kategori utama"
          icon="services"
        />
        <MetricCard
          label="PAKET & BUNDLE FAVORIT"
          value={5}
          note="Paling sering dipesan pelanggan"
          icon="working"
          tone="blue"
        />
        <MetricCard
          label="HARGA RATA-RATA"
          value={formatRupiah(210000)}
          note="+15% dari periode sebelumnya"
          icon="services"
        />
      </div>
      <div className="figma-manage-section">
        <div
          className="order-tabs manage-tabs"
          role="group"
          aria-label="Kategori layanan"
        >
          {categories.map((item) => (
            <button
              key={item}
              className={category === item ? "selected" : ""}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="figma-list">
          {visible.map((item) => (
            <article className="figma-service-row" key={item.id}>
              <div className="figma-service-top">
                <div>
                  <span className="figma-kicker">
                    {item.description} · {item.category}
                  </span>
                  <h3>{item.name}</h3>
                  <p>Durasi: {item.duration}</p>
                </div>
                <small>#{item.id}</small>
              </div>
              <div className="figma-feature-list">
                {(item.features?.length
                  ? item.features
                  : [item.category, item.duration]
                ).map((feature) => (
                  <span key={feature}>✓ {feature}</span>
                ))}
              </div>
              <div className="figma-service-bottom">
                <span>
                  <strong>{formatRupiah(item.price)}</strong>{" "}
                  <small>/mulai pengerjaan</small>
                </span>
                <div className="figma-row-actions">
                  <button
                    className="text-action"
                    onClick={() => {
                      setEditing(item);
                      setFormOpen(true);
                    }}
                  >
                    <UiIcon name="edit" /> Ubah Harga & Edit
                  </button>
                  <button
                    className="button"
                    onClick={() => {
                      setEditing(item);
                      setFormOpen(true);
                    }}
                  >
                    Detail Layanan
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {visible.length === 0 && <AdminEmpty />}
      </div>
      {formOpen && (
        <ServiceForm
          key={editing?.id ?? "new"}
          initial={editing ?? blankService}
          onClose={() => setFormOpen(false)}
          onSave={save}
        />
      )}
    </>
  );
}

function ServiceForm({
  initial,
  onClose,
  onSave,
}: {
  initial: Service;
  onClose: () => void;
  onSave: (service: Service) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
    });
  };
  return (
    <Modal
      title={initial.id ? "Ubah layanan" : "Tambah layanan"}
      subtitle="Data katalog demo Cleango"
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="modal-body manage-form">
          <div className="form-grid">
            <label className="full-width">
              Nama layanan
              <input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label>
              Kategori
              <select
                value={draft.category}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value })
                }
              >
                <option>Rumah</option>
                <option>Kantor</option>
                <option>Sofa</option>
                <option>AC</option>
              </select>
            </label>
            <label>
              Durasi
              <input
                required
                value={draft.duration}
                onChange={(e) =>
                  setDraft({ ...draft, duration: e.target.value })
                }
              />
            </label>
            <label>
              Harga (Rp)
              <input
                required
                type="number"
                min="0"
                step="1000"
                value={draft.price}
                onChange={(e) =>
                  setDraft({ ...draft, price: Number(e.target.value) })
                }
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
            <label className="full-width">
              Deskripsi
              <textarea
                required
                rows={3}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </label>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="button" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="button primary">
            Simpan layanan
          </button>
        </div>
      </form>
    </Modal>
  );
}
