import type { NextFunction, Request, Response } from 'express';
import { estimateWorkCompletion } from '../../lib/work-estimate.js';
import { AppError } from '../../lib/AppError.js';
import {
  BookingConflictError,
  createBooking,
  findBookableService,
  findCustomerBooking,
  findOwnedAddress,
  findPrimaryAddressId,
  isSlotLeadTimePassed,
  isValidSlot,
  listAvailability,
  listCustomerBookings,
  resolveBookableServiceId,
  validateBookingDate,
  type BookingSlot,
} from '../../model/booking.model.js';
import { findPromoByCode } from '../../model/promo.model.js';
import { calculateDiscount, promoIssue } from './promo.controller.js';
import { statusLabel } from '../../lib/order-status.js';

function customerId(request: Request): number {
  if (!request.user) throw new AppError(401, 'Authentication diperlukan', 'AUTH_REQUIRED');
  return request.user.id;
}

function numericId(value: unknown, label: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0)
    throw new AppError(400, `${label} tidak valid`, 'VALIDATION_ERROR');
  return id;
}

function textValue(body: Record<string, unknown>, key: string, max: number): string {
  if (body[key] === undefined || body[key] === null) return '';
  if (typeof body[key] !== 'string')
    throw new AppError(400, 'Periksa kembali data yang dikirim.', 'VALIDATION_ERROR', {
      [key]: 'Harus berupa teks.',
    });
  const value = (body[key] as string).trim();
  if (value.length > max)
    throw new AppError(400, 'Periksa kembali data yang dikirim.', 'VALIDATION_ERROR', {
      [key]: `Maksimal ${max} karakter.`,
    });
  return value;
}

export async function getAvailability(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    customerId(request);
    const date = typeof request.query.date === 'string' ? request.query.date.trim() : '';
    if (!date)
      throw new AppError(400, 'Periksa kembali data yang dikirim.', 'VALIDATION_ERROR', {
        date: 'Tanggal wajib diisi.',
      });
    const issue = validateBookingDate(date);
    if (issue) throw new AppError(400, issue.message, issue.code, { date: issue.message });

    let serviceId: number | null = null;
    if (request.query.service !== undefined && request.query.service !== '') {
      serviceId = await resolveBookableServiceId(String(request.query.service));
      if (!serviceId) throw new AppError(404, 'Layanan tidak ditemukan.');
    }

    response.status(200).json({ data: await listAvailability(date, serviceId) });
  } catch (error) {
    next(error);
  }
}

export async function createCustomerBooking(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = customerId(request);
    const body = request.body as Record<string, unknown>;

    const serviceId = await resolveBookableServiceId(String(body.serviceId ?? ''));
    if (!serviceId)
      throw new AppError(404, 'Layanan tidak ditemukan.', 'VALIDATION_ERROR', {
        serviceId: 'Layanan tidak tersedia.',
      });
    const date = typeof body.date === 'string' ? body.date.trim() : '';
    const time = body.time;

    const issue = validateBookingDate(date);
    if (issue) throw new AppError(400, issue.message, issue.code, { date: issue.message });
    if (!isValidSlot(time))
      throw new AppError(400, 'Jam pengerjaan tidak valid.', 'VALIDATION_ERROR', {
        time: 'Pilih salah satu slot yang tersedia.',
      });
    const slot = time as BookingSlot;
    if (isSlotLeadTimePassed(date, slot))
      throw new AppError(400, 'Waktu pemesanan sudah lewat.', 'SLOT_CLOSED', {
        time: 'Pilih slot lain.',
      });

    const service = await findBookableService(serviceId);
    if (!service) throw new AppError(404, 'Layanan tidak ditemukan.');
    if (!service.active)
      throw new AppError(400, 'Layanan sedang tidak tersedia.', 'SERVICE_INACTIVE', {
        serviceId: 'Layanan sedang tidak tersedia.',
      });

    let addressId: number | null = null;
    if (body.addressId !== undefined && body.addressId !== null && body.addressId !== '') {
      addressId = numericId(body.addressId, 'ID alamat');
      if (!(await findOwnedAddress(userId, addressId)))
        throw new AppError(404, 'Alamat tidak ditemukan.');
    } else {
      addressId = await findPrimaryAddressId(userId);
      if (!addressId)
        throw new AppError(400, 'Tambahkan alamat terlebih dahulu.', 'ADDRESS_REQUIRED', {
          addressId: 'Alamat wajib dipilih.',
        });
    }

    const notes = textValue(body, 'notes', 2000);

    const promoCode =
      typeof body.promoCode === 'string' ? body.promoCode.trim().toUpperCase() : '';
    let promo: { id: number; discountAmount: number; perCustomerLimit: number } | null =
      null;
    if (promoCode) {
      if (promoCode.length > 50)
        throw new AppError(400, 'Periksa kembali data yang dikirim.', 'VALIDATION_ERROR', {
          promoCode: 'Kode promo terlalu panjang.',
        });
      const found = await findPromoByCode(promoCode);
      if (!found) throw new AppError(404, 'Kode promo tidak ditemukan.');
      const promoError = promoIssue(found, service.price, serviceId);
      if (promoError)
        throw new AppError(400, promoError, 'PROMO_REJECTED', { promoCode: promoError });
      promo = {
        id: Number(found.id),
        discountAmount: calculateDiscount(found, service.price),
        perCustomerLimit: found.perCustomerLimit,
      };
    }

    try {
      const created = await createBooking({
        customerId: userId,
        serviceId,
        addressId,
        date,
        time: slot,
        notes,
        promo,
      });
      const data = await findCustomerBooking(userId, created.id);
      response.status(201).json({ message: 'Pesanan berhasil dibuat.', data });
    } catch (error) {
      if (error instanceof BookingConflictError) {
        if (error.reason === 'BUSY')
          throw new AppError(
            409,
            'Slot sedang dipesan pelanggan lain. Coba lagi.',
            'BOOKING_BUSY',
            { time: 'Coba lagi sebentar lagi.' },
          );
        if (error.reason === 'SLOT_FULL')
          throw new AppError(409, 'Slot sudah penuh.', 'SLOT_FULL', {
            time: 'Pilih slot lain.',
          });
        if (error.reason === 'PROMO_LIMIT')
          throw new AppError(
            400,
            'Batas pemakaian promo untuk akun ini sudah tercapai.',
            'PROMO_REJECTED',
            { promoCode: 'Promo ini sudah Anda pakai sesuai batas.' },
          );
        throw new AppError(
          409,
          'Anda sudah memesan layanan pada slot ini.',
          'DUPLICATE_BOOKING',
          { time: 'Pilih slot lain atau periksa Pesanan Anda.' },
        );
      }
      if (error instanceof Error && error.message === 'SERVICE_NOT_BOOKABLE')
        throw new AppError(400, 'Layanan sedang tidak tersedia.', 'SERVICE_INACTIVE');
      if (error instanceof Error && error.message === 'ADDRESS_NOT_OWNED')
        throw new AppError(404, 'Alamat tidak ditemukan.');
      throw error;
    }
  } catch (error) {
    next(error);
  }
}

export async function getCustomerBooking(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = customerId(request);
    const booking = await findCustomerBooking(
      userId,
      numericId(request.params.id, 'ID pesanan'),
    );
    if (!booking) throw new AppError(404, 'Pesanan tidak ditemukan.');
    response.status(200).json({ data: booking });
  } catch (error) {
    next(error);
  }
}

// Mirrors the admin order status labels used across the apps.
function apiStatus(status: string): string {
  return statusLabel(status);
}

export async function listMyBookings(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rows = await listCustomerBookings(customerId(request));
    response.status(200).json({
      data: rows.map((row) => ({
        id: String(row.id),
        code: row.code,
        date: row.date,
        time: row.time,
        service: row.service,
        serviceDurationMinutes: Number(row.serviceDurationMinutes) || null,
        startedAt: row.startedAt ? new Date(row.startedAt).toISOString() : null,
        estimatedCompletedAt: row.databaseStatus === 'in_progress'
          ? estimateWorkCompletion(row.startedAt, Number(row.serviceDurationMinutes)) : null,
        servicePrice: Number(row.servicePrice),
        platformFee: Number(row.platformFee),
        discountAmount: Number(row.discountAmount),
        totalAmount: Number(row.totalAmount),
        status: apiStatus(row.databaseStatus),
        paymentStatus: row.paymentStatus ?? null,
        recipientName: row.recipientName ?? null,
        recipientPhone: row.recipientPhone ?? null,
        landmark: row.landmark ?? '',
        cleanerName: row.cleanerName ?? null,
        hasReview: Boolean(row.hasReview),
        reviewEditable: Boolean(row.reviewEditable),
        reviewRating: row.reviewRating === null ? null : Number(row.reviewRating),
        reviewComment: row.reviewComment ?? null,
        reviewPhotos: (() => {
          const ids = row.reviewPhotoIds
            ? String(row.reviewPhotoIds).split(',').filter(Boolean)
            : [];
          const urls = row.reviewPhotos
            ? String(row.reviewPhotos).split(',').filter(Boolean)
            : [];
          return urls.map((url, index) => ({
            id: ids[index] ?? '',
            url,
          }));
        })(),
        notes: row.notes,
        addressLabel: row.addressLabel,
        address: row.address,
        latitude: row.latitude === null ? null : Number(row.latitude),
        longitude: row.longitude === null ? null : Number(row.longitude),
      })),
    });
  } catch (error) {
    next(error);
  }
}
