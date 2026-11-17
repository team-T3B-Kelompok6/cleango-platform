import type { AuditAction } from '@/types/audit';

export const AUDIT_COPY = {
  title: 'Audit Log Admin',
  description: 'Telusuri aktivitas admin dan perubahan data operasional.',
  reload: 'Muat ulang',
  demo: {
    lead: 'Mode demo.',
    text: ' Daftar memuat data contoh berlabel dan aktivitas yang dilakukan pada demo. Bukan riwayat server produksi.',
  },
  metrics: {
    found: 'Aktivitas ditemukan',
    foundUnit: 'Aktivitas',
    foundFiltered: 'Sesuai filter yang diterapkan',
    foundAll: 'Seluruh aktivitas tercatat',
    admins: 'Admin tercatat',
    adminsUnit: 'Admin',
    adminsNote: 'Admin dalam daftar riwayat',
    readOnlyTitle: 'Riwayat perubahan',
    readOnlyText:
      'Periksa siapa yang mengubah data, kapan, dan nilai apa yang berubah.',
  },
  filters: {
    label: 'Filter dan riwayat aktivitas',
    search: 'Cari aktivitas',
    searchPlaceholder: 'Cari aktivitas atau ID objek…',
    admin: 'Admin',
    allAdmins: 'Semua admin',
    selectedAdmin: 'Admin terpilih',
    action: 'Jenis aktivitas',
    allActions: 'Semua aktivitas',
    from: 'Dari tanggal',
    to: 'Sampai tanggal',
    apply: 'Terapkan filter',
    reset: 'Reset',
  },
  list: {
    title: 'Riwayat aktivitas',
    columns: ['Waktu', 'Admin', 'Aktivitas', 'Detail'],
    example: 'Data contoh',
    demoActor: 'Aktivitas demo',
    actor: 'Admin',
  },
  detail: {
    trigger: 'Lihat detail',
    title: 'Detail Aktivitas Admin',
    admin: 'Admin',
    time: 'Waktu',
    entity: 'Objek',
    entityId: 'ID objek',
    changes: 'Detail perubahan',
    column: 'Kolom',
    before: 'Sebelum',
    after: 'Sesudah',
    emptyBoth: 'Rincian perubahan belum tersedia untuk aktivitas ini.',
    emptyValues: 'Aktivitas ini tidak mencatat perubahan nilai data.',
    id: 'ID aktivitas: ',
  },
  pagination: {
    label: 'Halaman riwayat aktivitas',
  },
  states: {
    filterTitle: 'Periksa filter tanggal dan aktivitas',
    filterAction: 'Reset filter',
    unavailableTitle: 'Riwayat aktivitas belum tersedia',
    unavailableText:
      'Pencatatan aktivitas belum tersedia pada layanan data. Riwayat akan ditampilkan setelah layanan siap.',
    errorTitle: 'Riwayat aktivitas belum dapat dimuat',
    errorText:
      'Coba muat ulang halaman. Jika masih gagal, hubungi tim operasional.',
    retry: 'Coba lagi',
    pageMissingTitle: 'Halaman tidak ditemukan',
    emptyFilteredTitle: 'Tidak ada aktivitas yang sesuai',
    emptyTitle: 'Belum ada aktivitas tercatat',
    emptyFilteredText: 'Coba ubah admin, tanggal, atau jenis aktivitas.',
    emptyText: 'Aktivitas admin akan muncul di sini setelah tercatat.',
    firstPage: 'Kembali ke halaman pertama',
    resetFilter: 'Reset filter',
  },
} as const;

/** Warna badge per jenis aktivitas (string kelas penuh, bukan gabungan). */
export const actionTone: Record<AuditAction, string> = {
  create: 'bg-accent-soft text-accent',
  update: 'bg-info-soft text-info',
  delete: 'bg-danger-soft text-danger',
  assign: 'bg-warning-soft text-warning',
  login: 'bg-surface-soft text-ink-muted',
};

export const badgeClass =
  'inline-flex items-center rounded-[5px] px-8 py-4 text-[11px] leading-[1.5] font-semibold';

export const labelClass =
  'grid min-w-0 gap-8 text-sm leading-[1.4] font-semibold text-ink-soft';

export const inputClass =
  'min-h-42 w-full min-w-0 rounded-[8px] border border-line bg-surface px-12 py-10 text-base text-ink';

export const panelClass =
  'min-w-0 overflow-hidden rounded-card border border-line bg-surface';

/** Grid baris daftar: 4 kolom di desktop, 2 kolom di layar sedang. */
export const entryGridClass =
  'grid grid-cols-[minmax(110px,0.85fr)_minmax(145px,1.1fr)_minmax(0,2fr)_110px] items-center gap-16 px-22 py-16 max-lg:grid-cols-2 max-lg:gap-10 max-sm:px-16';
