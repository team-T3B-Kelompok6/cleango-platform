import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import {
  deletePromoById,
  findPromo,
  findPromoByCode,
  insertPromo,
  listPromos,
  updatePromoById,
  type DiscountType,
  type PromoInput,
  type PromoScope,
} from '../model/promo.model.js';
import { positiveId, validationError } from './resource-validation.js';

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,29}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function text(body: Record<string, unknown>, field: string, label: string, max: number): string {
  const value = typeof body[field] === 'string' ? (body[field] as string).trim() : '';
  if (!value) validationError({ [field]: `${label} wajib diisi.` });
  if (value.length > max)
    validationError({ [field]: `${label} maksimal ${max} karakter.` });
  return value;
}

function integer(
  body: Record<string, unknown>,
  field: string,
  label: string,
  minimum: number,
  optional = false,
): number | null {
  if (body[field] === undefined || body[field] === null || body[field] === '') {
    if (optional) return null;
    validationError({ [field]: `${label} wajib diisi.` });
  }
  const value = Number(body[field]);
  if (!Number.isSafeInteger(value) || value < minimum)
    validationError({
      [field]:
        minimum === 0
          ? `${label} harus bilangan bulat nol atau lebih.`
          : `${label} harus bilangan bulat lebih dari nol.`,
    });
  return value;
}

function isoDate(body: Record<string, unknown>, field: string, label: string): string {
  const value = typeof body[field] === 'string' ? (body[field] as string).trim() : '';
  if (!DATE_PATTERN.test(value) || !Number.isFinite(Date.parse(value)))
    validationError({ [field]: `${label} tidak valid.` });
  return value;
}

function inputFrom(
  body: Record<string, unknown>,
  partial: boolean,
): Partial<PromoInput> {
  const input: Partial<PromoInput> = {};

  if (!partial || body.name !== undefined) input.name = text(body, 'name', 'Nama promo', 80);
  if (!partial || body.code !== undefined) {
    const code = text(body, 'code', 'Kode promo', 30).toUpperCase();
    if (!CODE_PATTERN.test(code))
      validationError({
        code: 'Gunakan 3-30 huruf/angka tanpa spasi. Tanda - dan _ boleh dipakai.',
      });
    input.code = code;
  }
  if (!partial || body.discountType !== undefined) {
    const value = body.discountType;
    if (value !== 'percentage' && value !== 'fixed')
      validationError({ discountType: 'Pilih jenis diskon yang tersedia.' });
    input.discountType = value as DiscountType;
  }
  if (!partial || body.discountValue !== undefined) {
    input.discountValue = integer(body, 'discountValue', 'Nilai diskon', 1)!;
    if (input.discountType === 'percentage' && input.discountValue > 100)
      validationError({
        discountValue: 'Persentase diskon harus antara 1 dan 100.',
      });
  }
  if (!partial || body.maxDiscount !== undefined) {
    input.maxDiscount =
      input.discountType === 'fixed'
        ? null
        : integer(body, 'maxDiscount', 'Maksimal potongan', 1, true);
  }
  if (!partial || body.minPurchase !== undefined)
    input.minPurchase = integer(body, 'minPurchase', 'Minimal transaksi', 0)!;
  if (!partial || body.scope !== undefined) {
    const scope = body.scope;
    if (scope !== 'all' && scope !== 'services')
      validationError({ scope: 'Pilih cakupan layanan.' });
    input.scope = scope as PromoScope;
  }
  if (!partial || body.serviceIds !== undefined) {
    const raw = body.serviceIds;
    if (raw !== undefined && !Array.isArray(raw))
      validationError({ serviceIds: 'Pilihan layanan tidak valid.' });
    const selected = [...new Set((Array.isArray(raw) ? raw : []).map(String))];
    if (selected.some((id) => !id || id.length > 100) || selected.length > 500)
      validationError({ serviceIds: 'Pilihan layanan tidak valid.' });
    if (input.scope === 'services' && !selected.length)
      validationError({ serviceIds: 'Pilih minimal satu layanan untuk promo ini.' });
    input.serviceIds = input.scope === 'all' ? [] : selected;
  }
  if (!partial || body.startsOn !== undefined)
    input.startsOn = isoDate(body, 'startsOn', 'Tanggal mulai');
  if (!partial || body.endsOn !== undefined)
    input.endsOn = isoDate(body, 'endsOn', 'Tanggal akhir');
  if (input.startsOn && input.endsOn && input.startsOn > input.endsOn)
    validationError({ endsOn: 'Tanggal akhir tidak boleh mendahului tanggal mulai.' });
  if (!partial || body.usageLimit !== undefined)
    input.usageLimit = integer(body, 'usageLimit', 'Kuota pemakaian', 1, true);
  if (!partial || body.perCustomerLimit !== undefined)
    input.perCustomerLimit = integer(body, 'perCustomerLimit', 'Batas per pelanggan', 1)!;
  if (!partial || body.stackable !== undefined) {
    if (typeof body.stackable !== 'boolean')
      validationError({ stackable: 'Pilih status tumpuk promo.' });
    input.stackable = body.stackable as boolean;
  }
  if (!partial || body.active !== undefined) {
    if (typeof body.active !== 'boolean')
      validationError({ active: 'Pilih status aktif.' });
    input.active = body.active as boolean;
  }
  return input;
}

export async function getPromos(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.status(200).json({ data: await listPromos() });
  } catch (error) {
    next(error);
  }
}

export async function getPromo(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await findPromo(positiveId(request.params.id, 'ID promo'));
    if (!data) throw new AppError(404, 'Promo tidak ditemukan.');
    response.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function createPromo(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = inputFrom(request.body as Record<string, unknown>, false) as PromoInput;
    if (await findPromoByCode(input.code))
      throw new AppError(400, 'Kode promo sudah dipakai.', 'VALIDATION_ERROR', {
        code: 'Kode promo sudah dipakai.',
      });
    const data = await insertPromo(input);
    response.status(201).json({ message: 'Promo berhasil dibuat.', data });
  } catch (error) {
    next(error);
  }
}

export async function updatePromo(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = positiveId(request.params.id, 'ID promo');
    const input = inputFrom(request.body as Record<string, unknown>, true);
    if (input.code) {
      const existing = await findPromoByCode(input.code);
      if (existing && existing.id !== String(id))
        throw new AppError(400, 'Kode promo sudah dipakai.', 'VALIDATION_ERROR', {
          code: 'Kode promo sudah dipakai.',
        });
    }
    const data = await updatePromoById(id, input);
    if (!data) throw new AppError(404, 'Promo tidak ditemukan.');
    response.status(200).json({ message: 'Promo berhasil diperbarui.', data });
  } catch (error) {
    next(error);
  }
}

export async function deletePromo(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!(await deletePromoById(positiveId(request.params.id, 'ID promo'))))
      throw new AppError(404, 'Promo tidak ditemukan.');
    response.status(200).json({ message: 'Promo berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
}