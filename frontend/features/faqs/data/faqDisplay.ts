import type { RecordData } from '@/types';

/** Tab FAQ: gabungan kategori resmi dan kategori yang muncul di data. */
export function faqTabs(categories: { name: string }[], records: RecordData[]) {
  return [
    'Semua',
    ...new Set([
      ...categories.map((category) => category.name),
      ...records.map((record) => String(record.category)),
    ]),
  ];
}

const CATEGORY_TONES: Record<string, string> = {
  Layanan: 'green',
  Jadwal: 'blue',
  Pembayaran: 'amber',
  SOP: 'purple',
};

/** Warna tag kategori FAQ. */
export function faqCategoryTone(category: string) {
  return CATEGORY_TONES[category] ?? 'green';
}

/** Label "Diperbarui <tanggal>" dalam WIB. */
export function faqUpdatedLabel(value: unknown) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))
    return null;
  return new Date(value).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
  });
}

/** Tanggal panjang untuk preview detail (mis. 17 November 2026). */
export function faqDateLabel(value: unknown) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))
    return 'Belum tersedia';
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
}

/** Angka ringkasan halaman FAQ. */
export function faqSummary(
  records: RecordData[],
  categoryNames: string[] = [],
) {
  const categories = [
    ...new Set([
      ...categoryNames,
      ...records.map((record) => String(record.category)),
    ]),
  ];
  const mostRead = [...records]
    .filter((item) => typeof item.viewCount === 'number')
    .sort((a, b) => Number(b.viewCount) - Number(a.viewCount))[0];
  const active = records.filter((item) => item.published === true).length;
  return { categories, mostRead, active };
}
