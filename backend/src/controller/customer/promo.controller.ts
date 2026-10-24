import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../lib/AppError.js';
import {
  findPromoByCode,
  listActivePromos,
  type Promo,
} from '../../model/promo.model.js';

function validationError(field: string, message: string): AppError {
  return new AppError(400, 'Periksa kembali data yang dikirim.', 'VALIDATION_ERROR', {
    [field]: message,
  });
}

function todayJakarta(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

/**
 * Discount rule mirrors the admin web (`frontend/lib/promo-rules.ts`):
 * percentage → round(price * value / 100) capped by maxDiscount, fixed → value,
 * never more than the price itself.
 */
export function calculateDiscount(
  promo: Promo,
  price: number,
): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  const raw =
    promo.discountType === 'percentage'
      ? Math.round((price * Math.min(promo.discountValue, 100)) / 100)
      : Math.round(promo.discountValue);
  const capped =
    promo.discountType === 'percentage' && promo.maxDiscount !== null
      ? Math.min(raw, promo.maxDiscount)
      : raw;
  return Math.max(0, Math.min(capped, price));
}

/** Returns the reason a promo cannot be used, or null when it is usable. */
export function promoIssue(
  promo: Promo,
  price: number,
  serviceId: number | null,
): string | null {
  if (!promo.active) return 'Kode promo sudah tidak aktif.';
  const today = todayJakarta();
  if (promo.startsOn > today) return 'Kode promo belum berlaku.';
  if (promo.endsOn < today) return 'Kode promo sudah kedaluwarsa.';
  if (promo.usageLimit !== null && (promo.usedCount ?? 0) >= promo.usageLimit)
    return 'Kuota promo sudah habis.';
  if (price < promo.minPurchase)
    return `Minimal transaksi Rp${promo.minPurchase.toLocaleString('id-ID')}.`;
  if (
    promo.scope === 'services' &&
    promo.serviceIds.length > 0 &&
    (serviceId === null || !promo.serviceIds.includes(String(serviceId)))
  )
    return 'Promo tidak berlaku untuk layanan ini.';
  return null;
}

export async function getCustomerPromos(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.status(200).json({ data: await listActivePromos() });
  } catch (error) {
    next(error);
  }
}

export async function validateCustomerPromo(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = request.body as Record<string, unknown>;
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (!code) throw validationError('code', 'Kode promo wajib diisi.');
    if (code.length > 50) throw validationError('code', 'Kode promo terlalu panjang.');

    const price = Number(body.amount);
    if (!Number.isFinite(price) || price < 0)
      throw validationError('amount', 'Total belanja tidak valid.');

    let serviceId: number | null = null;
    if (body.serviceId !== undefined && body.serviceId !== null && body.serviceId !== '') {
      const parsed = Number(body.serviceId);
      if (!Number.isInteger(parsed) || parsed <= 0)
        throw validationError('serviceId', 'Layanan tidak valid.');
      serviceId = parsed;
    }

    const promo = await findPromoByCode(code);
    if (!promo) throw new AppError(404, 'Kode promo tidak ditemukan.');

    const issue = promoIssue(promo, price, serviceId);
    if (issue) throw new AppError(400, issue, 'PROMO_REJECTED', { code: issue });

    response.status(200).json({
      data: {
        code: promo.code,
        name: promo.name,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        maxDiscount: promo.maxDiscount,
        minPurchase: promo.minPurchase,
        scope: promo.scope,
        serviceIds: promo.serviceIds,
        startsOn: promo.startsOn,
        endsOn: promo.endsOn,
        discountAmount: calculateDiscount(promo, price),
      },
    });
  } catch (error) {
    next(error);
  }
}
