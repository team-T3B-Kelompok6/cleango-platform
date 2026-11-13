import { timingSafeEqual } from 'node:crypto';
import { getEnv } from '../config/env.js';
import { AppError } from './AppError.js';
import type { PaymentMethod } from './payment-gateway.js';

export interface XenditSession {
  sessionId: string;
  referenceId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELED';
  amount: number;
  currency: 'IDR';
  sessionType: 'PAY';
  checkoutUrl: string | null;
  expiresAt: string | null;
}

// Fixed provider origin: never forward backend credentials to a client-supplied URL.
async function xenditRequest(path: string, body?: Record<string, unknown>): Promise<unknown> {
  const { XENDIT_SECRET_KEY } = getEnv();
  if (!XENDIT_SECRET_KEY) {
    throw new AppError(503, 'Xendit belum dikonfigurasi.', 'PAYMENT_GATEWAY_UNAVAILABLE');
  }
  let response: Response;
  try {
    response = await fetch(`https://api.xendit.co${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${XENDIT_SECRET_KEY}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    });
  } catch {
    throw new AppError(502, 'Xendit belum merespons. Periksa status sebelum mencoba pembayaran lagi.', 'XENDIT_UNAVAILABLE');
  }
  // Do not log provider bodies: they may contain personal data or credentials.
  if (!response.ok) {
    throw new AppError(502, 'Permintaan pembayaran ditolak Xendit. Periksa konfigurasi dan status di Dashboard Xendit.', 'XENDIT_REQUEST_FAILED');
  }
  try {
    return await response.json();
  } catch {
    throw new AppError(502, 'Respons Xendit tidak valid.', 'XENDIT_INVALID_RESPONSE');
  }
}

export function isXenditCheckoutUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      ['checkout.xendit.co', 'checkout-staging.xendit.co', 'xen.to', 'dev.xen.to'].includes(url.hostname);
  } catch {
    return false;
  }
}

export function parseSession(value: unknown): XenditSession {
  const data = value as Record<string, unknown> | null;
  if (!data || typeof data !== 'object' ||
      typeof data.payment_session_id !== 'string' || !/^ps-[a-zA-Z0-9-]{1,140}$/.test(data.payment_session_id) ||
      typeof data.reference_id !== 'string' || !data.reference_id || data.reference_id.length > 64 ||
      !['ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELED'].includes(String(data.status)) ||
      data.currency !== 'IDR' || data.session_type !== 'PAY' ||
      typeof data.amount !== 'number' || !Number.isSafeInteger(data.amount) || data.amount <= 0 ||
      (data.payment_link_url != null && !isXenditCheckoutUrl(data.payment_link_url)) ||
      (data.expires_at != null && (typeof data.expires_at !== 'string' || !Number.isFinite(Date.parse(data.expires_at))))) {
    throw new AppError(502, 'Data sesi Xendit tidak valid.', 'XENDIT_INVALID_RESPONSE');
  }
  if (data.status === 'ACTIVE' && !isXenditCheckoutUrl(data.payment_link_url)) {
    throw new AppError(502, 'URL pembayaran Xendit tidak tersedia.', 'XENDIT_INVALID_RESPONSE');
  }
  return {
    sessionId: data.payment_session_id,
    referenceId: data.reference_id,
    status: data.status as XenditSession['status'],
    amount: data.amount,
    currency: 'IDR',
    sessionType: 'PAY',
    checkoutUrl: (data.payment_link_url as string | null) ?? null,
    expiresAt: (data.expires_at as string | null) ?? null,
  };
}

export async function createSession(input: {
  referenceId: string;
  bookingId: number;
  customerId: number;
  amount: number;
  method: PaymentMethod;
}): Promise<{ sessionId: string; checkoutUrl: string; expiresAt: string | null }> {
  const env = getEnv();
  if (!env.XENDIT_WEBHOOK_TOKEN) {
    throw new AppError(503, 'Token webhook Xendit belum dikonfigurasi.', 'PAYMENT_GATEWAY_UNAVAILABLE');
  }
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.method === 'cash') {
    throw new AppError(400, 'Tagihan pembayaran digital tidak valid.', 'INVALID_PAYMENT_AMOUNT');
  }
  const channels = { qris: 'QRIS', dana: 'DANA', gopay: 'GOPAY' };
  const session = parseSession(await xenditRequest('/sessions', {
    reference_id: input.referenceId,
    session_type: 'PAY',
    mode: 'PAYMENT_LINK',
    amount: input.amount,
    currency: 'IDR',
    country: 'ID',
    allowed_payment_channels: [channels[input.method]],
    capture_method: 'AUTOMATIC',
    description: `Pembayaran CleanGo #${input.bookingId}`,
    metadata: { booking_id: String(input.bookingId), customer_id: String(input.customerId) },
    ...(env.XENDIT_SUCCESS_RETURN_URL ? { success_return_url: env.XENDIT_SUCCESS_RETURN_URL } : {}),
    ...(env.XENDIT_CANCEL_RETURN_URL ? { cancel_return_url: env.XENDIT_CANCEL_RETURN_URL } : {}),
  }));
  if (session.referenceId !== input.referenceId || session.amount !== input.amount ||
      session.status !== 'ACTIVE' || !session.checkoutUrl) {
    throw new AppError(502, 'Sesi Xendit tidak sesuai tagihan.', 'XENDIT_INVALID_RESPONSE');
  }
  return { sessionId: session.sessionId, checkoutUrl: session.checkoutUrl, expiresAt: session.expiresAt };
}

export async function readSession(sessionId: string): Promise<XenditSession> {
  if (!/^ps-[a-zA-Z0-9-]{1,140}$/.test(sessionId)) {
    throw new AppError(400, 'ID sesi pembayaran tidak valid.', 'INVALID_PAYMENT_SESSION');
  }
  const session = parseSession(await xenditRequest(`/sessions/${encodeURIComponent(sessionId)}`));
  if (session.sessionId !== sessionId) {
    throw new AppError(502, 'ID sesi Xendit tidak cocok.', 'XENDIT_INVALID_RESPONSE');
  }
  return session;
}

export function verifyXenditWebhook(token: string | undefined): boolean {
  const secret = getEnv().XENDIT_WEBHOOK_TOKEN;
  if (!secret || !token) return false;
  const actual = Buffer.from(token);
  const expected = Buffer.from(secret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
