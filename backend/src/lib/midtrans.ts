import { createHash, timingSafeEqual } from 'node:crypto';
import { getEnv } from '../config/env.js';
import { AppError } from './AppError.js';
import type { PaymentMethod } from './payment-gateway.js';

export interface MidtransSession {
  sessionId: string;
  referenceId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELED';
  amount: number;
  currency: 'IDR';
  sessionType: 'PAY';
  checkoutUrl: string | null;
  expiresAt: string | null;
}

function baseUrl(): string {
  return getEnv().MIDTRANS_IS_PRODUCTION
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';
}

async function request(path: string, body?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { MIDTRANS_SERVER_KEY, MIDTRANS_NOTIFICATION_URL } = getEnv();
  if (!MIDTRANS_SERVER_KEY) {
    throw new AppError(503, 'Midtrans belum dikonfigurasi.', 'PAYMENT_GATEWAY_UNAVAILABLE');
  }
  let response: Response;
  try {
    const origin = body
      ? (getEnv().MIDTRANS_IS_PRODUCTION ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com')
      : baseUrl();
    response = await fetch(`${origin}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64')}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(MIDTRANS_NOTIFICATION_URL ? { 'X-Override-Notification': MIDTRANS_NOTIFICATION_URL } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(body ? 30000 : 15000),
      redirect: 'error',
    });
  } catch {
    throw new AppError(502, 'Midtrans belum merespons. Periksa status transaksi sebelum mencoba lagi.', 'MIDTRANS_UNAVAILABLE');
  }
  if (response.status === 401 || response.status === 403) {
    throw new AppError(502,
      'Autentikasi backend ditolak Midtrans. Admin perlu memeriksa Server Key dan mode Sandbox/Production.',
      'MIDTRANS_AUTH_FAILED');
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new AppError(502, 'Respons Midtrans tidak valid.', 'MIDTRANS_INVALID_RESPONSE');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AppError(502, 'Respons Midtrans tidak valid.', 'MIDTRANS_INVALID_RESPONSE');
  }
  const result = data as Record<string, unknown>;
  // Snap order has no transaction status until payer selects a method.
  if ((response.status === 404 || result.status_code === '404') && path.endsWith('/status')) {
    throw new AppError(404, 'Transaksi Snap belum memiliki status pembayaran.', 'MIDTRANS_NOT_CHARGED');
  }
  if (!response.ok) {
    throw new AppError(502, 'Permintaan pembayaran ditolak Midtrans. Periksa konfigurasi dan status di Dashboard.', 'MIDTRANS_REQUEST_FAILED');
  }
  return result;
}

function validOrderId(value: string): boolean {
  return /^mid-[a-f0-9-]{36}$/.test(value);
}

export async function createSession(input: {
  referenceId: string;
  bookingId: number;
  customerId: number;
  amount: number;
  method: PaymentMethod;
}): Promise<{ sessionId: string; checkoutUrl: string; expiresAt: string | null }> {
  const { MIDTRANS_SERVER_KEY } = getEnv();
  if (!MIDTRANS_SERVER_KEY) {
    throw new AppError(503, 'Kunci Midtrans belum dikonfigurasi.', 'PAYMENT_GATEWAY_UNAVAILABLE');
  }
  if (!validOrderId(input.referenceId) || input.method !== 'qris' ||
      !Number.isSafeInteger(input.bookingId) || input.bookingId <= 0 ||
      !Number.isSafeInteger(input.customerId) || input.customerId <= 0 ||
      !Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new AppError(400, 'Tagihan pembayaran Midtrans tidak valid.', 'INVALID_PAYMENT_AMOUNT');
  }
  const allowedPayments = ['other_qris'];
  const data = await request('/snap/v1/transactions', {
    transaction_details: { order_id: input.referenceId, gross_amount: input.amount },
    item_details: [{ id: `booking-${input.bookingId}`, price: input.amount, quantity: 1, name: `CleanGo booking ${input.bookingId}` }],
    customer_details: { first_name: `Customer ${input.customerId}` },
    enabled_payments: allowedPayments,
  });
  if (typeof data.token !== 'string' || !data.token || typeof data.redirect_url !== 'string') {
    throw new AppError(502, 'Respons checkout Midtrans tidak lengkap.', 'MIDTRANS_INVALID_RESPONSE');
  }
  let url: URL;
  try { url = new URL(data.redirect_url); } catch {
    throw new AppError(502, 'URL checkout Midtrans tidak valid.', 'MIDTRANS_INVALID_RESPONSE');
  }
  const allowedHosts = getEnv().MIDTRANS_IS_PRODUCTION
    ? ['app.midtrans.com'] : ['app.sandbox.midtrans.com'];
  if (url.protocol !== 'https:' || !allowedHosts.includes(url.hostname) || url.port || url.username || url.password ||
      !url.pathname.startsWith('/snap/')) {
    throw new AppError(502, 'URL checkout Midtrans tidak aman.', 'MIDTRANS_INVALID_RESPONSE');
  }
  return { sessionId: input.referenceId, checkoutUrl: url.toString(), expiresAt: null };
}

export async function readSession(orderId: string): Promise<MidtransSession> {
  if (!validOrderId(orderId)) {
    throw new AppError(400, 'ID transaksi Midtrans tidak valid.', 'INVALID_PAYMENT_SESSION');
  }
  const data = await request(`/v2/${encodeURIComponent(orderId)}/status`);
  if (data.order_id !== orderId || typeof data.status_code !== 'string' || !/^\d{3}$/.test(data.status_code) ||
      typeof data.gross_amount !== 'string' || !/^\d+(\.\d{1,2})?$/.test(data.gross_amount)) {
    throw new AppError(502, 'Status transaksi Midtrans tidak valid.', 'MIDTRANS_INVALID_RESPONSE');
  }
  const amount = Number(data.gross_amount);
  const currency = typeof data.currency === 'string' ? data.currency : 'IDR';
  const transactionStatus = String(data.transaction_status);
  const fraudStatus = String(data.fraud_status ?? '');
  if (!Number.isSafeInteger(amount) || amount <= 0 || currency !== 'IDR' ||
      !['settlement', 'capture', 'expire', 'cancel', 'pending', 'deny', 'authorize', 'failure', 'refund', 'partial_refund'].includes(transactionStatus)) {
    throw new AppError(502, 'Data pembayaran Midtrans tidak valid.', 'MIDTRANS_INVALID_RESPONSE');
  }
  let status: MidtransSession['status'];
  if (transactionStatus === 'settlement' || (transactionStatus === 'capture' && fraudStatus === 'accept')) status = 'COMPLETED';
  else if (transactionStatus === 'expire') status = 'EXPIRED';
  else if (transactionStatus === 'cancel') status = 'CANCELED';
  else status = 'ACTIVE'; // pending, deny, and challenge remain unpaid/retryable.
  if (transactionStatus === 'refund' || transactionStatus === 'partial_refund') {
    throw new AppError(409, 'Refund Midtrans perlu rekonsiliasi admin.', 'MIDTRANS_RECONCILIATION_REQUIRED');
  }
  return {
    sessionId: orderId, referenceId: orderId, status, amount, currency: currency as 'IDR',
    sessionType: 'PAY', checkoutUrl: null,
    // ponytail: provider timestamp has no offset; checkout displays expiry until explicit timezone support.
    expiresAt: null,
  };
}

export function verifyNotificationSignature(body: unknown): boolean {
  const key = getEnv().MIDTRANS_SERVER_KEY;
  if (!key || !body || typeof body !== 'object' || Array.isArray(body)) return false;
  const notification = body as Record<string, unknown>;
  if (typeof notification.order_id !== 'string' || typeof notification.status_code !== 'string' ||
      typeof notification.gross_amount !== 'string' || !/^\d+(\.\d{1,2})?$/.test(notification.gross_amount) ||
      typeof notification.signature_key !== 'string' || notification.signature_key.length !== 128 ||
      !/^[a-f0-9]{128}$/i.test(notification.signature_key)) return false;
  const expected = createHash('sha512')
    .update(`${notification.order_id}${notification.status_code}${notification.gross_amount}${key}`)
    .digest('hex');
  const actual = notification.signature_key;
  const actualBytes = Buffer.from(actual, 'hex');
  const expectedBytes = Buffer.from(expected, 'hex');
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}
