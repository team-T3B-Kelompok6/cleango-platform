import type { AuditAction, AuditFilters, AuditLog } from '@/types/audit';
import type { Search } from '@/types';

export const auditActions: Record<AuditAction, string> = {
  create: 'Tambah data',
  update: 'Ubah data',
  delete: 'Hapus data',
  assign: 'Penugasan',
  login: 'Login',
};

const auditEntities: Record<string, string> = {
  services: 'Layanan',
  categories: 'Kategori',
  orders: 'Pesanan',
  staff: 'Petugas',
  customers: 'Customer',
  faqs: 'FAQ',
  schedules: 'Jadwal',
  promos: 'Kode promo',
  banners: 'Banner',
  auth: 'Akun admin',
};

export function auditEntityName(entityType: string) {
  return Object.hasOwn(auditEntities, entityType)
    ? auditEntities[entityType]
    : entityType;
}

const auditFieldLabels: Record<string, string> = {
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

/** Label kolom pada tabel perubahan; kunci asing ditampilkan apa adanya. */
export function auditFieldLabel(key: string) {
  return Object.hasOwn(auditFieldLabels, key) ? auditFieldLabels[key] : key;
}

/** Nilai sebelum/sesudah untuk tabel perubahan. */
export function auditValueText(value: unknown): string {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
  if (Array.isArray(value))
    return value.length ? value.map(auditValueText).join(', ') : 'Tidak ada';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

/** Jumlah halaman riwayat; minimal satu meski kosong. */
export function auditPageCount({
  total,
  pageSize,
}: {
  total: number;
  pageSize: number;
}) {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Rentang baris pada halaman aktif, mis. "1–8 dari 40 aktivitas". */
export function auditPageRange(
  page: number,
  { total, pageSize }: { total: number; pageSize: number },
) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return from + '–' + to + ' dari ' + total + ' aktivitas · Terbaru dahulu';
}

/** Apakah pengguna sedang memakai filter apa pun. */
export function auditHasFilter(filters: AuditFilters) {
  return !!(
    filters.q ||
    filters.adminId ||
    filters.action ||
    filters.from ||
    filters.to
  );
}

/** Admin terpilih yang tidak lagi ada di daftar admin backend. */
export function auditSelectedAdminMissing(
  filters: AuditFilters,
  admins: { id: string }[],
) {
  return (
    !!filters.adminId && !admins.some((admin) => admin.id === filters.adminId)
  );
}

/** Status kegagalan muat: riwayat belum tersedia atau error sementara. */
export function auditIssue(status: number): 'unavailable' | 'error' {
  return status === 404 || status === 501 ? 'unavailable' : 'error';
}

export function auditDate(value: string, time = false) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    ...(time
      ? ({ hour: '2-digit', minute: '2-digit', second: '2-digit' } as const)
      : ({ day: 'numeric', month: 'short', year: 'numeric' } as const)),
  }).format(new Date(value));
}

function auditDay(value: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(
    new Date(value),
  );
}

function validDate(value: string) {
  const parsed = new Date(value + 'T00:00:00Z');
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function auditFilters(search: Search): {
  filters: AuditFilters;
  error?: string;
} {
  const text = (key: string) =>
    typeof search[key] === 'string' ? search[key].trim() : '';
  const page = Number(text('page') || 1);
  const filters = {
    q: text('q'),
    adminId: text('adminId'),
    action: text('action'),
    from: text('from'),
    to: text('to'),
    page,
  };
  if (filters.q.length > 150 || filters.adminId.length > 100)
    return { filters, error: 'Pencarian atau pilihan admin terlalu panjang.' };
  if (filters.action && !Object.hasOwn(auditActions, filters.action))
    return { filters, error: 'Pilih jenis aktivitas yang tersedia.' };
  if ([filters.from, filters.to].some((date) => date && !validDate(date)))
    return { filters, error: 'Gunakan tanggal yang valid.' };
  if (filters.from && filters.to && filters.from > filters.to)
    return {
      filters,
      error: 'Tanggal mulai tidak boleh melewati tanggal akhir.',
    };
  if (!Number.isSafeInteger(page) || page < 1)
    return { filters, error: 'Nomor halaman tidak valid.' };
  return { filters };
}

export function auditQuery(filters: AuditFilters, page = filters.page) {
  const query = new URLSearchParams();
  for (const key of ['q', 'adminId', 'action', 'from', 'to'] as const)
    if (filters[key]) query.set(key, filters[key]);
  query.set('page', String(page));
  return query.toString();
}

const sensitive =
  /password|passwd|token|secret|authorization|cookie|credential|api[_-]?key/i;

export function auditSnapshot(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[Data terlalu dalam]';
  if (value === null || typeof value === 'number' || typeof value === 'boolean')
    return value;
  if (typeof value === 'string') return value.slice(0, 3000);
  if (Array.isArray(value))
    return value.slice(0, 100).map((item) => auditSnapshot(item, depth + 1));
  if (!value || typeof value !== 'object') return null;
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 100)
      .filter(([key]) => !sensitive.test(key))
      .map(([key, entry]) => [key, auditSnapshot(entry, depth + 1)]),
  );
}

export function auditChanges(log: AuditLog) {
  const before = (auditSnapshot(log.before) ?? {}) as Record<string, unknown>;
  const after = (auditSnapshot(log.after) ?? {}) as Record<string, unknown>;
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(
      (key) =>
        !['id', 'isDemo'].includes(key) &&
        JSON.stringify(before[key]) !== JSON.stringify(after[key]),
    )
    .map((key) => ({ key, before: before[key], after: after[key] }));
}

export function filterAuditLogs(logs: AuditLog[], filters: AuditFilters) {
  return logs
    .filter(
      (log) =>
        (!filters.adminId || log.admin.id === filters.adminId) &&
        (!filters.action || log.action === filters.action) &&
        (!filters.from || auditDay(log.createdAt) >= filters.from) &&
        (!filters.to || auditDay(log.createdAt) <= filters.to) &&
        (!filters.q ||
          [
            log.summary,
            log.entityId,
            log.admin.name,
            auditEntityName(log.entityType),
          ]
            .join(' ')
            .toLocaleLowerCase('id')
            .includes(filters.q.toLocaleLowerCase('id'))),
    )
    .sort(
      (left, right) =>
        Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
        right.id.localeCompare(left.id),
    );
}
