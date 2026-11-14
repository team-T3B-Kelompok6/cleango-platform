import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import { getEnv } from '../config/env.js';
import { readSession as readMidtransSession, verifyNotificationSignature } from '../lib/midtrans.js';
import { applyMidtransSessionEvent } from '../model/payment.model.js';

export async function postMidtransWebhook(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!getEnv().MIDTRANS_SERVER_KEY) {
      throw new AppError(503, 'Midtrans belum dikonfigurasi.', 'PAYMENT_GATEWAY_UNAVAILABLE');
    }
    const payload = request.body as unknown;
    if (getEnv().MIDTRANS_IS_PRODUCTION === false && payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const probe = payload as Record<string, unknown>;
      // Sandbox connectivity probe is untrusted and must never reach payment reconciliation.
      if (typeof probe.merchant_id === 'string' && /^M\d+$/.test(probe.merchant_id) &&
          typeof probe.order_id === 'string' &&
          /^payment_notif_test_M\d+_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(probe.order_id) &&
          probe.order_id.startsWith(`payment_notif_test_${probe.merchant_id}_`)) {
        response.status(200).json({ received: true, ignored: true, test: true,
          message: 'Tes koneksi webhook diterima; bukan konfirmasi pembayaran.' });
        return;
      }
    }
    if (!verifyNotificationSignature(payload)) {
      throw new AppError(401, 'Signature notifikasi Midtrans tidak valid.', 'INVALID_SIGNATURE');
    }
    const body = payload as Record<string, unknown>;
    if (typeof body.order_id !== 'string') throw new AppError(400, 'Order ID Midtrans tidak valid.', 'VALIDATION_ERROR');
    const session = await readMidtransSession(body.order_id);
    const incomingAmount = Number(body.gross_amount);
    if (session.referenceId !== body.order_id || session.currency !== 'IDR' ||
        !Number.isSafeInteger(incomingAmount) || session.amount !== incomingAmount) {
      throw new AppError(409, 'Status transaksi Midtrans tidak cocok.', 'PAYMENT_SESSION_MISMATCH');
    }
    if (session.status === 'ACTIVE') {
      response.status(200).json({ received: true, ignored: true });
      return;
    }
    const result = await applyMidtransSessionEvent({
      sessionId: session.sessionId,
      referenceId: session.referenceId,
      status: session.status === 'COMPLETED' ? 'paid' : 'expired',
      amount: session.amount,
    });
    if (!result.ok) throw new AppError(409, 'Transaksi Midtrans tidak cocok dengan tagihan tersimpan.', 'PAYMENT_SESSION_MISMATCH');
    response.status(200).json({ data: { status: result.status } });
  } catch (error) { next(error); }
}
