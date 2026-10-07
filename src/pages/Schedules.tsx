import { useRef, useState, type FormEvent } from "react";
import {
  AdminBadge,
  AdminEmpty,
  AdminHeading,
  ActionButton,
  containsSearch,
} from "../components/AdminUi";
import { Icon } from "../components/Icon";
import { MetricCard, Modal } from "../components/ui";
import { useOutsideDismiss } from "../components/useOutsideDismiss";
import { demoDate } from "../data/orders";
import { nextId, type Schedule } from "../data/admin";
import { useDemo } from "../data/store";

const blankSchedule: Schedule = {
  id: "",
  customer: "",
  service: "",
  date: demoDate,
  time: "08.00 WIB",
  staff: "Belum ditugaskan",
  status: "Terjadwal",
};
const shifts = [
  {
    id: "pagi",
    label: "Shift Pagi",
    time: "08.00–11.30 WIB",
    start: 0,
    end: 12,
    color: "green",
    newTime: "08.00 WIB",
  },
  {
    id: "siang",
    label: "Shift Siang",
    time: "12.00–15.30 WIB",
    start: 12,
    end: 16,
    color: "blue",
    newTime: "13.00 WIB",
  },
  {
    id: "sore",
    label: "Shift Sore",
    time: "16.00–19.30 WIB",
    start: 16,
    end: 24,
    color: "amber",
    newTime: "16.00 WIB",
  },
];

export function Schedules() {
  const { schedules, setSchedules, services, staff, customers, search } =
    useDemo();
  const [date, setDate] = useState(demoDate);
  const [draftDate, setDraftDate] = useState(demoDate);
  const [dateOpen, setDateOpen] = useState(false);
  const dateAnchor = useRef<HTMLDivElement>(null);
  useOutsideDismiss(dateAnchor, dateOpen, () => setDateOpen(false));
  const [shift, setShift] = useState("semua");
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [newTime, setNewTime] = useState("08.00 WIB");
  const [formOpen, setFormOpen] = useState(false);
  const visible = schedules.filter(
    (item) =>
      item.date === date &&
      containsSearch(search, item.customer, item.service, item.staff, item.id),
  );
  const openNew = (time = "08.00 WIB") => {
    setEditing(null);
    setNewTime(time);
    setFormOpen(true);
  };
  const save = (schedule: Schedule) => {
    setSchedules((current) =>
      editing
        ? current.map((item) => (item.id === editing.id ? schedule : item))
        : [...current, { ...schedule, id: nextId("JD") }],
    );
    setFormOpen(false);
  };
  return (
    <>
      <AdminHeading
        title="Kelola Jadwal"
        description="Atur jadwal kru harian, pembagian shift / paket siang, serta jadwal tambahan dari customer."
        action={
          <div className="admin-heading-actions">
            <div className="date-filter-anchor" ref={dateAnchor}>
              <button
                className="button date-filter"
                aria-expanded={dateOpen}
                aria-haspopup="dialog"
                onClick={() => {
                  setDraftDate(date);
                  setDateOpen((value) => !value);
                }}
              >
                <Icon name="calendar" />
                Filter Tanggal
              </button>
              <div
                className="date-popover single-date-popover"
                data-open={dateOpen}
                aria-hidden={!dateOpen}
                inert={!dateOpen}
                role="dialog"
                aria-labelledby="schedule-date-title"
              >
                <div className="modal-header">
                  <div>
                    <h2 id="schedule-date-title">Filter tanggal</h2>
                    <p>Pilih tanggal jadwal operasional</p>
                  </div>
                  <button
                    className="close-button"
                    aria-label="Tutup filter tanggal"
                    onClick={() => setDateOpen(false)}
                  >
                    ×
                  </button>
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setDate(draftDate);
                    setDateOpen(false);
                  }}
                >
                  <div className="modal-body form-grid">
                    <label>
                      Tanggal jadwal
                      <input
                        type="date"
                        required
                        value={draftDate}
                        onChange={(event) => setDraftDate(event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="button"
                      onClick={() => {
                        setDate(demoDate);
                        setDateOpen(false);
                      }}
                    >
                      Hari demo
                    </button>
                    <button className="button primary">Terapkan</button>
                  </div>
                </form>
              </div>
            </div>
            <ActionButton icon="calendar" onClick={() => openNew()}>
              Atur Jadwal Baru
            </ActionButton>
          </div>
        }
      />
      <div className="metrics-grid admin-metrics">
        <MetricCard
          label="TOTAL JADWAL HARI INI"
          value={9 + schedules.length - 4}
          unit="Jadwal"
          note="7 terisi aktif + 2 slot tersedia"
          icon="calendar"
        />
        <MetricCard
          label="PETUGAS BERJAGA"
          value={12 + staff.length - 5}
          unit="Petugas"
          note="9 bertugas + 3 standby"
          icon="staff"
          tone="blue"
        />
        <MetricCard
          label="JADWAL BLOKIR / IZIN"
          value={1}
          unit="Perlu Dicek"
          note="Admin perlu konfirmasi"
          icon="clock"
          tone="amber"
        />
      </div>
      <div className="figma-manage-section">
        <div
          className="order-tabs manage-tabs"
          role="group"
          aria-label="Filter shift jadwal"
        >
          {[
            { id: "semua", label: "Semua Shift" },
            ...shifts.map((item) => ({ id: item.id, label: item.label })),
          ].map((item) => (
            <button
              key={item.id}
              className={shift === item.id ? "selected" : ""}
              aria-pressed={shift === item.id}
              onClick={() => setShift(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="shift-board" key={`${date}-${shift}`}>
          {shifts
            .filter((item) => shift === "semua" || shift === item.id)
            .map((slot) => {
              const entries = visible.filter((item) => {
                const hour = Number.parseInt(item.time, 10);
                return hour >= slot.start && hour < slot.end;
              });
              return (
                <section className="shift-section" key={slot.id}>
                  <div className="shift-heading">
                    <h2>
                      <i className={slot.color} />
                      {slot.label} <span>({slot.time})</span>
                    </h2>
                    <small>{entries.length} Order</small>
                    {slot.id === "pagi" && (
                      <span className="shift-availability">
                        Kondisi: Berlangsung Tepat
                      </span>
                    )}
                  </div>
                  <div className="shift-grid">
                    {entries.map((item) => (
                      <article className="shift-card" key={item.id}>
                        <AdminBadge
                          tone={
                            item.status === "Berlangsung"
                              ? "blue"
                              : item.status === "Selesai"
                                ? "green"
                                : item.staff === "Belum ditugaskan"
                                  ? "amber"
                                  : "gray"
                          }
                        >
                          {item.status === "Berlangsung"
                            ? "Sedang Dikerjakan"
                            : item.status === "Selesai"
                              ? "Selesai"
                              : item.staff === "Belum ditugaskan"
                                ? "Menunggu Petugas"
                                : "Siap Berangkat"}
                        </AdminBadge>
                        <h3>{item.customer}</h3>
                        <p>{item.service}</p>
                        <small>
                          <Icon name="calendar" />
                          {customers.find(
                            (customer) => customer.name === item.customer,
                          )?.address ?? "Jakarta Selatan"}
                        </small>
                        <div className="shift-card-bottom">
                          <span>{item.time}</span>
                          <button
                            className="button"
                            onClick={() => {
                              setEditing(item);
                              setFormOpen(true);
                            }}
                          >
                            Detail &amp; Ubah
                          </button>
                        </div>
                      </article>
                    ))}
                    {entries.length < 2 && (
                      <article className="shift-card empty-slot">
                        <Icon name="clock" />
                        <h3>Slot Shift Masih Tersedia</h3>
                        <p>Masih bisa menerima order baru.</p>
                        <button
                          className="button"
                          onClick={() => openNew(slot.newTime)}
                        >
                          + Tambah Order ke Sini
                        </button>
                      </article>
                    )}
                  </div>
                </section>
              );
            })}
          {visible.length === 0 && search && (
            <AdminEmpty title="Jadwal tidak ditemukan" />
          )}
        </div>
      </div>
      {formOpen && (
        <ScheduleForm
          key={editing?.id ?? `new-${newTime}`}
          initial={editing ?? { ...blankSchedule, date, time: newTime }}
          services={services
            .filter((item) => item.active)
            .map((item) => item.name)}
          staff={staff
            .filter((item) => item.status !== "Nonaktif")
            .map((item) => item.name)}
          onClose={() => setFormOpen(false)}
          onSave={save}
        />
      )}
    </>
  );
}

function ScheduleForm({
  initial,
  services,
  staff,
  onClose,
  onSave,
}: {
  initial: Schedule;
  services: string[];
  staff: string[];
  onClose: () => void;
  onSave: (schedule: Schedule) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      ...draft,
      customer: draft.customer.trim(),
      service: draft.service.trim(),
      time: draft.time.trim(),
    });
  };
  return (
    <Modal
      title={initial.id ? "Detail & Ubah Jadwal" : "Atur Jadwal Baru"}
      subtitle="Alokasi waktu dan penugasan kru lapangan"
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="modal-body manage-form">
          <div className="form-grid">
            <label className="full-width">
              Pelanggan
              <input
                required
                value={draft.customer}
                onChange={(event) =>
                  setDraft({ ...draft, customer: event.target.value })
                }
              />
            </label>
            <label className="full-width">
              Layanan
              <input
                required
                list="schedule-services"
                value={draft.service}
                onChange={(event) =>
                  setDraft({ ...draft, service: event.target.value })
                }
              />
              <datalist id="schedule-services">
                {services.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </label>
            <label>
              Tanggal
              <input
                required
                type="date"
                value={draft.date}
                onChange={(event) =>
                  setDraft({ ...draft, date: event.target.value })
                }
              />
            </label>
            <label>
              Jam
              <input
                required
                value={draft.time}
                onChange={(event) =>
                  setDraft({ ...draft, time: event.target.value })
                }
              />
            </label>
            <label>
              Petugas
              <select
                value={draft.staff}
                onChange={(event) =>
                  setDraft({ ...draft, staff: event.target.value })
                }
              >
                <option>Belum ditugaskan</option>
                {[...new Set([...staff, draft.staff])]
                  .filter((item) => item !== "Belum ditugaskan")
                  .map((item) => (
                    <option key={item}>{item}</option>
                  ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={draft.status}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    status: event.target.value as Schedule["status"],
                  })
                }
              >
                <option>Terjadwal</option>
                <option>Berlangsung</option>
                <option>Selesai</option>
              </select>
            </label>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="button" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="button primary">
            Simpan Jadwal
          </button>
        </div>
      </form>
    </Modal>
  );
}
