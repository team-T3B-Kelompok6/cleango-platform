import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../lib/AppError.js';
import {
  PAYMENT_METHODS,
  startBookingPayment,
  type StartPaymentResult,
} from '../../model/payment.model.js';
import type { PaymentMethod } from '../../lib/payment-gateway.js';
import { findCustomerBooking } from '../../model/booking.model.js';

function customerId(request: Request): number {
  if (!request.user)
    throw new AppError(401, 'Authentication diperlukan', 'AUTH_REQUIRED');
  return request.user.id;
}

export async function payBooking(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const bookingId = Number(request.params.id);
    if (!Number.isInteger(bookingId) || bookingId <= 0)
      throw new AppError(400, 'ID pesanan tidak valid', 'VALIDATION_ERROR');
    const body = (request.body ?? {}) as Record<string, unknown>;
    const method = typeof body.method === 'string' ? body.method.trim() : '';
    if (!PAYMENT_METHODS.includes(method as PaymentMethod))
      throw new AppError(400, 'Periksa kembali data yang dikirim.', 'VALIDATION_ERROR', {
        method: 'Pilih metode pembayaran yang tersedia.',
      });

    const result: StartPaymentResult = await startBookingPayment(
      customerId(request),
      bookingId,
      method as PaymentMethod,
    );
    if (!result.ok) {
      if (result.reason === 'NOT_FOUND')
        throw new AppError(404, 'Pesanan tidak ditemukan.');
      if (result.reason === 'CLOSED')
        throw new AppError(
          409,
          'Pesanan ini sudah selesai atau dibatalkan.',
          'PAYMENT_CLOSED',
        );
      throw new AppError(
        409,
        'Metode ini belum tersedia. Pilih pembayaran tunai.',
        'PAYMENT_GATEWAY_UNAVAILABLE',
      );
    }
    const receipt = await findCustomerBooking(customerId(request), bookingId);
    if (!receipt) throw new AppError(404, 'Pesanan tidak ditemukan.');
    response.status(200).json({
      message:
        result.status === 'paid'
          ? 'Pembayaran sudah diterima.'
          : method === 'cash'
            ? 'Pesanan dikonfirmasi. Bayar tunai saat petugas tiba.'
            : 'Pembayaran menunggu konfirmasi gateway.',
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
}
