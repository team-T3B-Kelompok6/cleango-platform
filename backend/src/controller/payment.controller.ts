import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import { getEnv } from '../config/env.js';
import { readSession, verifyXenditWebhook } from '../lib/xendit.js';
import { readSession as readMidtransSession, verifyNotificationSignature } from '../lib/midtrans.js';
import { applyMidtransSessionEvent, applyXenditSessionEvent } from '../model/payment.model.js';

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

export async function postPaymentWebhook(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!getEnv().XENDIT_WEBHOOK_TOKEN) {
      throw new AppError(503, 'Webhook Xendit belum dikonfigurasi.', 'PAYMENT_GATEWAY_UNAVAILABLE');
    }
    if (!verifyXenditWebhook(request.header('x-callback-token'))) {
      throw new AppError(401, 'Token webhook Xendit tidak valid.', 'INVALID_SIGNATURE');
    }
    let payload: unknown;
    try {
      payload = JSON.parse(Buffer.isBuffer(request.body) ? request.body.toString('utf8') : '');
    } catch {
      throw new AppError(400, 'Payload webhook tidak valid.', 'VALIDATION_ERROR');
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new AppError(400, 'Payload webhook tidak valid.', 'VALIDATION_ERROR');
    }
    const body = payload as Record<string, unknown>;
    if (typeof body.event !== 'string') {
      throw new AppError(400, 'Event webhook tidak valid.', 'VALIDATION_ERROR');
    }
    if (!['payment_session.completed', 'payment_session.expired'].includes(body.event)) {
      response.status(200).json({ received: true, ignored: true });
      return;
    }
    const data = body.data as Record<string, unknown> | null;
    if (!data || typeof data !== 'object' ||
        typeof data.payment_session_id !== 'string' ||
        typeof data.reference_id !== 'string' || data.session_type !== 'PAY') {
      throw new AppError(400, 'Data sesi webhook tidak valid.', 'VALIDATION_ERROR');
    }
    // Read authoritative status/amount; a return URL or a client payload never settles payment.
    const session = await readSession(data.payment_session_id);
    if (session.referenceId !== data.reference_id) {
      throw new AppError(409, 'Referensi sesi pembayaran tidak cocok.', 'PAYMENT_REFERENCE_MISMATCH');
    }
    if (session.status === 'ACTIVE' || session.status === 'CANCELED') {
      response.status(200).json({ received: true, ignored: true });
      return;
    }
    const result = await applyXenditSessionEvent({
      sessionId: session.sessionId,
      referenceId: session.referenceId,
      status: session.status === 'COMPLETED' ? 'paid' : 'expired',
      amount: session.amount,
    });
    if (!result.ok) {
      throw new AppError(409, 'Sesi pembayaran tidak sesuai tagihan tersimpan.', 'PAYMENT_SESSION_MISMATCH');
    }
    response.status(200).json({ data: { status: result.status } });
  } catch (error) {
    next(error);
  }
}
