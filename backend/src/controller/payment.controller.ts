import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import { getEnv } from '../config/env.js';
import { manualGateway } from '../lib/payment-gateway.js';
import { PaymentTransitionError } from '../lib/payment-status.js';
import { applyPaymentEvent } from '../model/payment.model.js';

const WEBHOOK_STATUSES = ['paid', 'failed', 'expired'];

export async function postPaymentWebhook(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const secret = getEnv().PAYMENT_WEBHOOK_SECRET;
    if (!secret)
      throw new AppError(
        503,
        'Webhook pembayaran belum dikonfigurasi.',
        'PAYMENT_GATEWAY_UNAVAILABLE',
      );
    const raw = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
    const signature = request.header('x-payment-signature');
    if (!manualGateway.verifyWebhook(raw, signature, secret))
      throw new AppError(401, 'Signature webhook tidak valid.', 'INVALID_SIGNATURE');

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw.toString('utf8')) as Record<string, unknown>;
    } catch {
      throw new AppError(400, 'Payload webhook tidak valid.', 'VALIDATION_ERROR');
    }
    const bookingId = Number(body.bookingId);
    const amount = Number(body.amount);
    const status = typeof body.status === 'string' ? body.status : '';
    const reference =
      typeof body.reference === 'string' && body.reference.length <= 150
        ? body.reference
        : null;
    if (!Number.isInteger(bookingId) || bookingId <= 0)
      throw new AppError(400, 'ID pesanan tidak valid.', 'VALIDATION_ERROR');
    if (!Number.isFinite(amount) || amount < 0)
      throw new AppError(400, 'Nominal pembayaran tidak valid.', 'VALIDATION_ERROR');
    if (!WEBHOOK_STATUSES.includes(status))
      throw new AppError(400, 'Status pembayaran tidak dikenal.', 'VALIDATION_ERROR');

    const result = await applyPaymentEvent({
      bookingId,
      amount,
      status: status as 'paid' | 'failed' | 'expired',
      reference,
    });
    if (!result.ok) {
      if (result.reason === 'NOT_FOUND')
        throw new AppError(404, 'Pembayaran tidak ditemukan.');
      throw new AppError(
        409,
        'Nominal webhook tidak sesuai dengan tagihan.',
        'PAYMENT_AMOUNT_MISMATCH',
      );
    }
    response.status(200).json({ data: { status: result.status } });
  } catch (error) {
    if (error instanceof PaymentTransitionError)
      next(
        new AppError(
          409,
          'Status pembayaran tidak boleh kembali ke tahap sebelumnya.',
          'PAYMENT_TRANSITION_INVALID',
        ),
      );
    else next(error);
  }
}
