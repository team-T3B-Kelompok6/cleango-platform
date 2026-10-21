import Link from 'next/link';
import Form from 'next/form';
import { ApiError } from '@/lib/api';
import { listAuditLogs } from '@/lib/audit-api';
import {
  auditActions,
  auditChanges,
  auditDate,
  auditEntityName,
  auditFilters,
  auditQuery,
} from '@/lib/audit';
import { adminDemoEnabled } from '@/lib/demo/mode';
import type { Search } from '@/types';
import type { AuditLog, AuditPage } from '@/types/audit';
import { DialogTrigger, DialogCloseButton } from './DialogTrigger';
import { UiIcon } from './UiIcon';
import { MetricCard } from './MetricCard';

const fieldLabels: Record<string, string> = {
  name: 'Nama',
  price: 'Harga',
  active: 'Status aktif',
  category: 'Kategori',
  description: 'Deskripsi',
  duration: 'Durasi',
  features: 'Fasilitas',
  staff: 'Petugas',
  status: 'Status',
  published: 'Publikasi',
  question: 'Pertanyaan',
  answer: 'Jawaban',
  date: 'Tanggal',
  time: 'Waktu',
  area: 'Wilayah',
  resource: 'Jenis data',
  code: 'Kode promo',
  phone: 'Nomor telepon',
  email: 'Email',
  address: 'Alamat',
  updatedAt: 'Diperbarui pada',
};
function valueText(value: unknown): string {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
  if (Array.isArray(value))
    return value.length ? value.map(valueText).join(', ') : 'Tidak ada';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function AuditDetail({ log }: { log: AuditLog }) {
  const changes = auditChanges(log);
  return (
    <>
      <div className="modal-body audit-detail">
        <div className="audit-detail-summary">
          <span className={'audit-action ' + log.action}>
            {auditActions[log.action]}
          </span>
          {log.isExample && <span className="audit-example">Data contoh</span>}
          <h3>{log.summary}</h3>
          <dl>
            <div>
              <dt>Admin</dt>
              <dd>{log.admin.name}</dd>
            </div>
            <div>
              <dt>Waktu</dt>
              <dd>
                {auditDate(log.createdAt)} · {auditDate(log.createdAt, true)}{' '}
                WIB
              </dd>
            </div>
            <div>
              <dt>Objek</dt>
              <dd>{auditEntityName(log.entityType)}</dd>
            </div>
            <div>
              <dt>ID objek</dt>
              <dd>{log.entityId ?? '—'}</dd>
            </div>
          </dl>
        </div>
        <h3>Detail perubahan</h3>
        {changes.length ? (
          <div className="audit-changes">
            <div className="audit-change-head" aria-hidden="true">
              <span>Kolom</span>
              <span>Sebelum</span>
              <span>Sesudah</span>
            </div>
            {changes.map((change) => (
              <div className="audit-change" key={change.key}>
                <strong>
                  {Object.hasOwn(fieldLabels, change.key)
                    ? fieldLabels[change.key]
                    : change.key}
                </strong>
                <div>
                  <small aria-hidden="true">Sebelum</small>
                  <span className="sr-only">Sebelum: </span>
                  <span>{valueText(change.before)}</span>
                </div>
                <div>
                  <small aria-hidden="true">Sesudah</small>
                  <span className="sr-only">Sesudah: </span>
                  <span>{valueText(change.after)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="audit-detail-note">
            {log.before === undefined && log.after === undefined
              ? 'Rincian perubahan belum tersedia untuk aktivitas ini.'
              : 'Aktivitas ini tidak mencatat perubahan nilai data.'}
          </p>
        )}
        <p className="audit-detail-note">ID aktivitas: {log.id}</p>
      </div>
      <div className="modal-footer">
        <DialogCloseButton />
      </div>
    </>
  );
}

export async function AuditLogView({ search }: { search: Search }) {
  const { filters, error: filterError } = auditFilters(search);
  let result: AuditPage = {
    data: [],
    admins: [],
    meta: { total: 0, page: filters.page, pageSize: 8 },
  };
  let issue: 'unavailable' | 'error' | null = null;
  if (!filterError) {
    try {
      result = await listAuditLogs(filters);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      issue =
        error.status === 404 || error.status === 501 ? 'unavailable' : 'error';
    }
  }
  const { data, admins, meta } = result;
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const selectedAdminMissing =
    filters.adminId && !admins.some((admin) => admin.id === filters.adminId);
  const hasFilter = !!(
    filters.q ||
    filters.adminId ||
    filters.action ||
    filters.from ||
    filters.to
  );
  const href = (page: number) => '/audit-log?' + auditQuery(filters, page);
  return (
    <div className="audit-page">
      <div className="page-title admin-heading">
        <div>
          <h1>Audit Log Admin</h1>
          <p>Telusuri aktivitas admin dan perubahan data operasional.</p>
        </div>
        <a
          className="button"
          href={filterError ? '/audit-log' : href(filters.page)}
        >
          <UiIcon name="clock" /> Muat ulang
        </a>
      </div>
      {adminDemoEnabled() && (
        <p className="audit-demo-note" role="note">
          <UiIcon name="eye" />
          <span>
            <strong>Mode demo.</strong> Daftar memuat data contoh berlabel dan
            aktivitas yang dilakukan pada demo. Bukan riwayat server produksi.
          </span>
        </p>
      )}
      <div className="audit-metrics metrics-grid order-metrics">
        <MetricCard
          label="Aktivitas ditemukan"
          value={issue || filterError ? '—' : meta.total}
          unit={issue || filterError ? undefined : 'Aktivitas'}
          note={
            hasFilter
              ? 'Sesuai filter yang diterapkan'
              : 'Seluruh aktivitas tercatat'
          }
          icon="report"
          uiIcon="clock"
        />
        <MetricCard
          label="Admin tercatat"
          value={issue || filterError ? '—' : admins.length}
          unit={issue || filterError ? undefined : 'Admin'}
          note="Admin dalam daftar riwayat"
          icon="staff"
          uiIcon="person"
          tone="blue"
        />
        <div className="audit-readonly-card">
          <UiIcon name="shield" />
          <div>
            <strong>Riwayat perubahan</strong>
            <p>
              Periksa siapa yang mengubah data, kapan, dan nilai apa yang
              berubah.
            </p>
          </div>
        </div>
      </div>
      <section
        className="audit-panel"
        aria-label="Filter dan riwayat aktivitas"
      >
        <Form
          action="/audit-log"
          className="audit-filters"
          key={auditQuery(filters)}
        >
          <label className="audit-search">
            Cari aktivitas
            <input
              name="q"
              type="search"
              maxLength={150}
              placeholder="Cari aktivitas atau ID objek…"
              defaultValue={filters.q}
            />
          </label>
          <label>
            Admin
            <select name="adminId" defaultValue={filters.adminId}>
              <option value="">Semua admin</option>
              {selectedAdminMissing && (
                <option value={filters.adminId}>Admin terpilih</option>
              )}
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Jenis aktivitas
            <select name="action" defaultValue={filters.action}>
              <option value="">Semua aktivitas</option>
              {Object.entries(auditActions).map(([action, label]) => (
                <option key={action} value={action}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Dari tanggal
            <input
              name="from"
              type="date"
              defaultValue={filters.from}
              max={filters.to || undefined}
            />
          </label>
          <label>
            Sampai tanggal
            <input
              name="to"
              type="date"
              defaultValue={filters.to}
              min={filters.from || undefined}
            />
          </label>
          <div className="audit-filter-actions">
            <button className="button primary" type="submit">
              <UiIcon name="search" />
              Terapkan filter
            </button>
            <Link href="/audit-log" className="button">
              Reset
            </Link>
          </div>
        </Form>
        {filterError ? (
          <div className="audit-state" role="alert">
            <UiIcon name="calendar" />
            <h2>Periksa filter tanggal dan aktivitas</h2>
            <p>{filterError}</p>
            <Link href="/audit-log" className="button">
              Reset filter
            </Link>
          </div>
        ) : issue ? (
          <div
            className="audit-state"
            role={issue === 'error' ? 'alert' : 'status'}
          >
            <UiIcon name="clock" />
            <h2>
              {issue === 'unavailable'
                ? 'Riwayat aktivitas belum tersedia'
                : 'Riwayat aktivitas belum dapat dimuat'}
            </h2>
            <p>
              {issue === 'unavailable'
                ? 'Pencatatan aktivitas belum tersedia pada layanan data. Riwayat akan ditampilkan setelah layanan siap.'
                : 'Coba muat ulang halaman. Jika masih gagal, hubungi tim operasional.'}
            </p>
            <a className="button primary" href={href(filters.page)}>
              Coba lagi
            </a>
          </div>
        ) : !data.length ? (
          <div className="audit-state">
            <UiIcon name="search" />
            <h2>
              {filters.page > pageCount
                ? 'Halaman tidak ditemukan'
                : hasFilter
                  ? 'Tidak ada aktivitas yang sesuai'
                  : 'Belum ada aktivitas tercatat'}
            </h2>
            <p>
              {hasFilter
                ? 'Coba ubah admin, tanggal, atau jenis aktivitas.'
                : 'Aktivitas admin akan muncul di sini setelah tercatat.'}
            </p>
            {(hasFilter || filters.page > 1) && (
              <Link
                href={filters.page > 1 ? href(1) : '/audit-log'}
                className="button"
              >
                {filters.page > 1
                  ? 'Kembali ke halaman pertama'
                  : 'Reset filter'}
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="audit-list-heading">
              <h2>Riwayat aktivitas</h2>
              <span>
                {(filters.page - 1) * meta.pageSize + 1}–
                {Math.min(filters.page * meta.pageSize, meta.total)} dari{' '}
                {meta.total} aktivitas · Terbaru dahulu
              </span>
            </div>
            <div className="audit-table-head" aria-hidden="true">
              <span>Waktu</span>
              <span>Admin</span>
              <span>Aktivitas</span>
              <span>Detail</span>
            </div>
            <ol className="audit-list">
              {data.map((log) => (
                <li key={log.id} className="audit-entry">
                  <time dateTime={log.createdAt}>
                    <strong>{auditDate(log.createdAt)}</strong>
                    <span>{auditDate(log.createdAt, true)} WIB</span>
                  </time>
                  <div className="audit-actor">
                    <span className="audit-avatar" aria-hidden="true">
                      {log.admin.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join('')}
                    </span>
                    <span>
                      <strong>{log.admin.name}</strong>
                      <small>
                        {log.isExample
                          ? 'Data contoh'
                          : adminDemoEnabled()
                            ? 'Aktivitas demo'
                            : 'Admin'}
                      </small>
                    </span>
                  </div>
                  <div className="audit-event">
                    <span className={'audit-action ' + log.action}>
                      {auditActions[log.action]}
                    </span>
                    <h3>{log.summary}</h3>
                    <p>
                      {auditEntityName(log.entityType)}
                      {log.entityId ? ' · ' + log.entityId : ''}
                    </p>
                  </div>
                  <DialogTrigger
                    label="Lihat detail"
                    ariaLabel={'Lihat detail aktivitas ' + log.summary}
                    title="Detail Aktivitas Admin"
                    icon="eye"
                    dialogClass="audit-detail-dialog"
                    wide
                  >
                    <AuditDetail log={log} />
                  </DialogTrigger>
                </li>
              ))}
            </ol>
            <nav
              className="audit-pagination"
              aria-label="Halaman riwayat aktivitas"
            >
              <span>
                Halaman {filters.page} dari {pageCount}
              </span>
              <div>
                {filters.page > 1 ? (
                  <Link className="button" href={href(filters.page - 1)}>
                    Sebelumnya
                  </Link>
                ) : (
                  <button className="button" disabled>
                    Sebelumnya
                  </button>
                )}
                {filters.page < pageCount ? (
                  <Link className="button" href={href(filters.page + 1)}>
                    Berikutnya
                  </Link>
                ) : (
                  <button className="button" disabled>
                    Berikutnya
                  </button>
                )}
              </div>
            </nav>
          </>
        )}
      </section>
    </div>
  );
}
