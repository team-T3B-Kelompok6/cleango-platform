import { UiIcon } from "../components/UiIcon";
import { useEffect, useState, type FormEvent } from "react";
import {
  AdminEmpty,
  AdminHeading,
  ActionButton,
  containsSearch,
} from "../components/AdminUi";
import { Icon } from "../components/Icon";
import { Modal } from "../components/ui";
import { nextId, type Faq } from "../data/admin";
import { useDemo } from "../data/store";

const categories = ["Semua", "Layanan", "Pembayaran", "Jadwal", "SOP"];
const blankFaq: Faq = {
  id: "",
  category: "Layanan",
  question: "",
  answer: "",
  published: true,
};
const categoryTone = (category: string) =>
  category === "Pembayaran"
    ? "amber"
    : category === "Jadwal"
      ? "blue"
      : category === "SOP"
        ? "purple"
        : "green";
export function Faqs() {
  const { faqs, setFaqs, search } = useDemo();
  const [category, setCategory] = useState("Semua");
  const [inPageSearch, setInPageSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [deleting, setDeleting] = useState<Faq | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  useEffect(() => setPage(1), [search]);
  const visible = faqs.filter(
    (item) =>
      (category === "Semua" || item.category === category) &&
      containsSearch(search, item.question, item.answer, item.category) &&
      containsSearch(inPageSearch, item.question, item.answer, item.category),
  );
  const pageCount = Math.max(1, Math.ceil(visible.length / 4));
  const currentPage = Math.min(page, pageCount);
  const shown = visible.slice((currentPage - 1) * 4, currentPage * 4);
  const save = (faq: Faq) => {
    setFaqs((current) =>
      editing
        ? current.map((item) => (item.id === editing.id ? faq : item))
        : [...current, { ...faq, id: nextId("FAQ") }],
    );
    setFormOpen(false);
  };
  return (
    <div className="faq-page">
      <AdminHeading
        title="Kelola FAQ"
        description="Kelola daftar pertanyaan umum dan jawaban operasional Cleango."
        action={
          <ActionButton
            icon="faq"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Tambah FAQ
          </ActionButton>
        }
      />
      <div className="faq-summary-grid">
        <article className="faq-summary-card">
          <div>
            <small>TOTAL FAQ AKTIF</small>
            <strong>
              {faqs.filter((item) => item.published).length}{" "}
              <span>Pertanyaan</span>
            </strong>
            <p className="green">ⓥ Tersinkron di Aplikasi</p>
          </div>
          <span className="faq-summary-icon green">
            <Icon name="faq" />
          </span>
        </article>
        <article className="faq-summary-card">
          <div>
            <small>PALING SERING DIBACA</small>
            <h2>
              Cara Pesan &amp;
              <br />
              Reschedule
            </h2>
            <p className="green">
              <b>248 kali dibaca</b>
            </p>
            <p className="faq-summary-caption">↗ Tingkat kepuasan 98,4%</p>
          </div>
          <span className="faq-summary-icon amber">
            <UiIcon name="chart" />
          </span>
        </article>
        <article className="faq-summary-card">
          <div>
            <small>KATEGORI</small>
            <strong>
              {new Set(faqs.map((item) => item.category)).size}{" "}
              <span>Klasifikasi</span>
            </strong>
            <div className="faq-category-samples">
              <span>Layanan</span>
              <span>Bayar</span>
              <span>SOP</span>
            </div>
          </div>
          <span className="faq-summary-icon blue">
            <Icon name="package" />
          </span>
        </article>
      </div>
      <div className="faq-filter-bar">
        <div
          className="order-tabs manage-tabs"
          role="group"
          aria-label="Kategori FAQ"
        >
          {categories.map((item) => (
            <button
              key={item}
              className={category === item ? "selected" : ""}
              aria-pressed={category === item}
              onClick={() => {
                setCategory(item);
                setPage(1);
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="faq-in-page-search">
          <Icon name="search" />
          <input
            aria-label="Cari pertanyaan FAQ"
            placeholder="Cari pertanyaan..."
            value={inPageSearch}
            onChange={(event) => {
              setInPageSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>
      <div className="faq-design-list" key={`${category}-${currentPage}`}>
        {shown.map((item, index) => (
          <article className="faq-design-row" key={item.id}>
            <details>
              <summary>
                <span>
                  <span className="faq-row-meta">
                    <span
                      className={`faq-category-tag ${categoryTone(item.category)}`}
                    >
                      {item.category}
                    </span>
                    <span className="faq-publish-tag">
                      <i />
                      {item.published ? "Aktif" : "Draf"}
                    </span>
                    <small>• Diperbarui {index + 1} hari lalu</small>
                  </span>
                  <strong>{item.question}</strong>
                </span>
                <span className="faq-expand-icon">⌄</span>
              </summary>
              <p>{item.answer}</p>
            </details>
            <div className="faq-icon-actions">
              <button
                aria-label={`Ubah ${item.id}`}
                onClick={() => {
                  setEditing(item);
                  setFormOpen(true);
                }}
              >
                <UiIcon name="edit" />
              </button>
              <button
                aria-label={`Hapus ${item.id}`}
                onClick={() => setDeleting(item)}
              >
                <UiIcon name="trash" />
              </button>
            </div>
          </article>
        ))}
        {visible.length === 0 && (
          <AdminEmpty title="Pertanyaan tidak ditemukan" />
        )}
      </div>
      <div className="faq-pagination">
        <span>
          Menampilkan {shown.length} dari {visible.length} Pertanyaan
        </span>
        <nav aria-label="Halaman daftar FAQ">
          <button
            className="button"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            ‹ Sebelumnya
          </button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map(
            (item) => (
              <button
                key={item}
                aria-label={`Halaman ${item}`}
                aria-current={currentPage === item ? "page" : undefined}
                className={currentPage === item ? "selected" : ""}
                onClick={() => setPage(item)}
              >
                {item}
              </button>
            ),
          )}
          <button
            className="button"
            disabled={currentPage === pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            Selanjutnya ›
          </button>
        </nav>
      </div>
      {formOpen && (
        <FaqForm
          key={editing?.id ?? "new"}
          initial={editing ?? blankFaq}
          onClose={() => setFormOpen(false)}
          onSave={save}
        />
      )}
      {deleting && (
        <Modal
          title="Hapus Pertanyaan FAQ"
          subtitle={`#${deleting.id} · ${deleting.category}`}
          onClose={() => setDeleting(null)}
        >
          <div className="modal-body">
            <p className="faq-delete-question">{deleting.question}</p>
            <p className="muted">
              Pertanyaan ini akan dihapus dari daftar FAQ demo.
            </p>
          </div>
          <div className="modal-footer">
            <button className="button" onClick={() => setDeleting(null)}>
              Batal
            </button>
            <button
              className="button danger"
              onClick={() => {
                setFaqs((current) =>
                  current.filter((item) => item.id !== deleting.id),
                );
                setDeleting(null);
              }}
            >
              Hapus FAQ
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function FaqForm({
  initial,
  onClose,
  onSave,
}: {
  initial: Faq;
  onClose: () => void;
  onSave: (faq: Faq) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      ...draft,
      question: draft.question.trim(),
      answer: draft.answer.trim(),
    });
  };
  return (
    <Modal
      title={initial.id ? "Detail & Ubah FAQ" : "Tambah FAQ Baru"}
      subtitle="Konten pertanyaan yang ditampilkan kepada pelanggan"
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="modal-body manage-form">
          <div className="form-grid">
            <label>
              Kategori FAQ
              <select
                value={draft.category}
                onChange={(event) =>
                  setDraft({ ...draft, category: event.target.value })
                }
              >
                {categories.slice(1).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={draft.published ? "Tayang" : "Draf"}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    published: event.target.value === "Tayang",
                  })
                }
              >
                <option>Tayang</option>
                <option>Draf</option>
              </select>
            </label>
            <label className="full-width">
              Pertanyaan FAQ
              <input
                required
                value={draft.question}
                onChange={(event) =>
                  setDraft({ ...draft, question: event.target.value })
                }
              />
            </label>
            <label className="full-width">
              Jawaban FAQ
              <textarea
                required
                rows={5}
                value={draft.answer}
                onChange={(event) =>
                  setDraft({ ...draft, answer: event.target.value })
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
            Simpan FAQ
          </button>
        </div>
      </form>
    </Modal>
  );
}
