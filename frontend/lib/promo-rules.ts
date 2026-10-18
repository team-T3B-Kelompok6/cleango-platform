import type { Promo, PromoInput } from '@/types/promos';
import type { Service } from '@/types';

const whole = (value: unknown, minimum = 0): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum;
const date = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;

export function parsePromo(form: FormData) {
  const values: Record<string, string | string[]> = {};
  const errors: Record<string, string> = {};
  const text = (key: string) => {
    const value = String(form.get(key) ?? '').trim();
    values[key] = value;
    return value;
  };
  const name = text('name'),
    code = text('code').toUpperCase();
  values.code = code;
  if (!name || name.length > 80)
    errors.name = 'Isi nama promo, maksimal 80 karakter.';
  if (!/^[A-Z0-9][A-Z0-9_-]{2,29}$/.test(code))
    errors.code =
      'Gunakan 3–30 huruf/angka, tanpa spasi. Tanda - dan _ boleh dipakai.';
  const discountType = text('discountType');
  if (!['percentage', 'fixed'].includes(discountType))
    errors.discountType = 'Pilih jenis diskon yang tersedia.';
  const number = (key: string, minimum: number, optional = false) => {
    const raw = text(key);
    if (!raw && optional) return null;
    const value = Number(raw);
    if (!raw || !whole(value, minimum))
      errors[key] =
        minimum === 0
          ? 'Isi rupiah bulat, nol atau lebih.'
          : 'Isi bilangan bulat lebih dari nol.';
    return value;
  };
  const discountValue = number('discountValue', 1)!;
  if (discountType === 'percentage' && discountValue > 100)
    errors.discountValue = 'Persentase diskon harus antara 1 dan 100.';
  const enteredMax = number('maxDiscount', 1, true);
  const maxDiscount = discountType === 'percentage' ? enteredMax : null;
  if (discountType === 'fixed') delete errors.maxDiscount;
  const minPurchase = number('minPurchase', 0)!;
  const usageLimit = number('usageLimit', 1, true);
  const perCustomerLimit = number('perCustomerLimit', 1)!;
  const scope = text('scope');
  if (!['all', 'services'].includes(scope))
    errors.scope = 'Pilih cakupan layanan.';
  const selected = [...new Set(form.getAll('serviceIds').map(String))];
  values.serviceIds = selected;
  if (selected.some((id) => !id || id.length > 100) || selected.length > 500)
    errors.serviceIds = 'Pilihan layanan tidak valid.';
  if (scope === 'services' && !selected.length)
    errors.serviceIds = 'Pilih minimal satu layanan untuk promo ini.';
  const startsOn = text('startsOn'),
    endsOn = text('endsOn');
  if (!date(startsOn)) errors.startsOn = 'Pilih tanggal mulai yang valid.';
  if (!date(endsOn)) errors.endsOn = 'Pilih tanggal akhir yang valid.';
  if (date(startsOn) && date(endsOn) && startsOn > endsOn)
    errors.endsOn = 'Tanggal akhir tidak boleh mendahului tanggal mulai.';
  const flag = (key: string) => {
    const raw = text(key);
    if (!['true', 'false'].includes(raw))
      errors[key] = 'Pilih status yang valid.';
    return raw === 'true';
  };
  const stackable = false,
    active = flag('active');
  const data: PromoInput = {
    name,
    code,
    discountType: discountType as PromoInput['discountType'],
    discountValue,
    maxDiscount,
    minPurchase,
    scope: scope as PromoInput['scope'],
    serviceIds: scope === 'all' ? [] : selected,
    startsOn,
    endsOn,
    usageLimit,
    perCustomerLimit,
    stackable,
    active,
  };
  return { data, errors, values };
}

export function isPromo(value: unknown): value is Promo {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    !!p.id &&
    typeof p.name === 'string' &&
    !!p.name &&
    typeof p.code === 'string' &&
    /^[A-Z0-9][A-Z0-9_-]{2,29}$/.test(p.code) &&
    ['percentage', 'fixed'].includes(String(p.discountType)) &&
    whole(p.discountValue, 1) &&
    (p.discountType !== 'percentage' || p.discountValue <= 100) &&
    (p.maxDiscount === null || whole(p.maxDiscount, 1)) &&
    whole(p.minPurchase) &&
    ['all', 'services'].includes(String(p.scope)) &&
    Array.isArray(p.serviceIds) &&
    p.serviceIds.every((id) => typeof id === 'string' && !!id) &&
    (p.scope === 'all' ? p.serviceIds.length === 0 : p.serviceIds.length > 0) &&
    date(p.startsOn) &&
    date(p.endsOn) &&
    p.startsOn <= p.endsOn &&
    (p.usageLimit === null || whole(p.usageLimit, 1)) &&
    whole(p.perCustomerLimit, 1) &&
    typeof p.stackable === 'boolean' &&
    typeof p.active === 'boolean' &&
    (p.usedCount === undefined || whole(p.usedCount))
  );
}

export function promoStatus(promo: Promo, today: string) {
  if (!promo.active) return 'Nonaktif';
  if (promo.endsOn < today) return 'Berakhir';
  if (promo.startsOn > today) return 'Dijadwalkan';
  if (promo.usageLimit !== null && (promo.usedCount ?? 0) >= promo.usageLimit)
    return 'Kuota habis';
  return 'Aktif';
}

export function quotePromo(
  promo: Pick<
    PromoInput,
    | 'discountType'
    | 'discountValue'
    | 'maxDiscount'
    | 'minPurchase'
    | 'stackable'
  >,
  service: Pick<Service, 'price' | 'discountPrice'>,
) {
  const price = service.price;
  const none = (reason: string) => ({
    price,
    discount: 0,
    total: price,
    reason,
  });
  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(promo.discountValue) ||
    promo.discountValue <= 0
  )
    return none('Isi nilai diskon untuk melihat contoh potongan.');
  if (price < promo.minPurchase)
    return none('Harga layanan belum memenuhi minimal transaksi.');
  if (promo.discountType === 'percentage' && promo.discountValue > 100)
    return none('Isi persentase diskon antara 1 dan 100.');
  const raw =
    promo.discountType === 'percentage'
      ? Math.round((price * Math.min(promo.discountValue, 100)) / 100)
      : Math.round(promo.discountValue);
  const discount = Math.min(
    price,
    promo.discountType === 'percentage' && promo.maxDiscount !== null
      ? Math.min(raw, promo.maxDiscount)
      : raw,
  );
  return { price, discount, total: price - discount, reason: '' };
}
