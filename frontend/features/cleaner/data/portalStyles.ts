/** Kelas bersama halaman tugas petugas. */
export const tagClass =
  'inline-flex items-center gap-5 rounded-full bg-accent-soft px-9 py-4 text-xs leading-[1.5] font-medium text-accent';

export const cardClass =
  'min-w-0 rounded-[14px] border border-line bg-surface p-18';

export const sectionHeadingClass =
  'mb-14 flex flex-wrap items-baseline justify-between gap-10';

export const sectionTitleClass =
  'text-md leading-[1.55] font-semibold text-ink';

export const sectionMetaClass = 'text-xs leading-[1.6] text-accent';

export const metaTextClass = 'text-xs leading-[1.6] text-ink-muted';

export const iconAccentClass = 'size-[15px] shrink-0 text-accent';

export const fieldLabelClass = 'text-sm leading-[1.6] font-medium text-ink';

export const inputClass =
  'w-full min-w-0 resize-y rounded-md border border-line bg-surface-soft p-12 text-lg leading-[1.7] text-ink';

export const noticeErrorClass =
  'rounded-md border border-danger-soft bg-danger-soft px-15 py-13 text-base leading-[1.7] text-danger';

export const noticeSuccessClass =
  'rounded-md border border-line-strong bg-accent-soft px-15 py-13 text-base leading-[1.7] text-accent';

export const journeyLabels = [
  ['Menunggu Keberangkatan', 'Siap berangkat menuju pelanggan'],
  ['Sedang Perjalanan', 'Menuju lokasi pengerjaan'],
  ['Sedang Dikerjakan', 'Konfirmasi tiba dan mulai bekerja'],
  ['Pekerjaan Selesai', 'Simpan hasil dan laporan'],
] as const;
