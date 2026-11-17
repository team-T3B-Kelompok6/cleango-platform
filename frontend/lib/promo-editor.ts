import type { Service } from '@/types';
import type { Promo } from '@/types/promos';
import { promoStatus, quotePromo } from './promo-rules';
import { serviceMediaUrl } from './service-media';

export const PROMO_STATUSES = [
  'Aktif',
  'Dijadwalkan',
  'Berakhir',
  'Nonaktif',
  'Kuota habis',
];

type PromoValues = Record<string, string>;

/** Hasil perhitungan pratinjau harga promo. */
export type PromoQuote = ReturnType<typeof quotePromo>;

/** Nilai awal form promo. */
export function promoFormValues(promo?: Promo, today = ''): PromoValues {
  return {
    name: promo?.name ?? '',
    code: promo?.code ?? '',
    discountType: promo?.discountType ?? 'percentage',
    discountValue: String(promo?.discountValue ?? 25),
    maxDiscount: promo?.maxDiscount == null ? '' : String(promo.maxDiscount),
    minPurchase: String(promo?.minPurchase ?? 0),
    scope: promo?.scope ?? 'all',
    startsOn: promo?.startsOn ?? today,
    endsOn:
      promo?.endsOn ??
      new Date(Date.parse(today) + 7 * 86400000).toISOString().slice(0, 10),
    usageLimit: promo?.usageLimit == null ? '' : String(promo.usageLimit),
    perCustomerLimit: String(promo?.perCustomerLimit ?? 1),
    active: String(promo?.active ?? true),
  };
}

/** URL pratinjau banner promo yang sudah tersimpan. */
export function promoBannerUrl(promo?: Promo) {
  if (!promo?.bannerUrl) return null;
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;
  return serviceMediaUrl(promo.bannerUrl, base ? new URL(base).origin : '');
}

/** Validasi banner promo (JPG/PNG/WebP, maks. 2 MB). */
export function validatePromoBanner(file: File) {
  if (
    !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
    file.size > 2 * 1024 * 1024
  )
    return 'Gunakan JPG, PNG, atau WebP, maksimal 2 MB.';
  return '';
}

/** Filter daftar promo berdasarkan pencarian dan status. */
export function filterPromoList(
  promos: Promo[],
  { query, status }: { query: string; status: string },
  today: string,
) {
  return promos.filter(
    (promo) =>
      (!status || promoStatus(promo, today) === status) &&
      (!query ||
        (promo.name + ' ' + promo.code)
          .toLowerCase()
          .includes(query.toLowerCase().trim())),
  );
}

/** Cari layanan untuk dipilih pada promo. */
export function filterPromoServices(services: Service[], query: string) {
  return services.filter((service) =>
    (service.name + ' ' + service.category)
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
}

/** Layanan yang tercakup promo (untuk pratinjau harga). */
export function promoChoices(
  services: Service[],
  values: PromoValues,
  selected: string[],
) {
  return services.filter(
    (service) => values.scope === 'all' || selected.includes(service.id),
  );
}

/** Hitung pratinjau harga dari nilai form. */
export function promoQuote(values: PromoValues, example?: Service | null) {
  if (!example) return null;
  return quotePromo(
    {
      discountType: values.discountType as 'percentage' | 'fixed',
      discountValue: Number(values.discountValue),
      maxDiscount: values.maxDiscount ? Number(values.maxDiscount) : null,
      minPurchase: Number(values.minPurchase),
      stackable: false,
    },
    example,
  );
}

/** Nama layanan yang mendapat promo pada kartu daftar. */
export function promoServiceNames(promo: Promo, services: Service[]) {
  if (promo.scope === 'all') return 'Semua layanan';
  return promo.serviceIds
    .map(
      (id) =>
        services.find((service) => service.id === id)?.name || `Layanan #${id}`,
    )
    .join(', ');
}

/** Label tanggal singkat (WIB). */
export function promoDateLabel(date: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(date + 'T00:00:00+07:00'));
}
