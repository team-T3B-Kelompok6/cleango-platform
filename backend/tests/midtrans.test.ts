import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/env.js', () => ({ getEnv: () => ({
  MIDTRANS_SERVER_KEY: 'SB-server-test',
  MIDTRANS_CLIENT_KEY: 'Mid-client-test',
  MIDTRANS_IS_PRODUCTION: false,
  MIDTRANS_NOTIFICATION_URL: 'https://example.test/api/payments/webhook/midtrans',
}) }));
import { createHash } from 'node:crypto';
import { createSession, readSession, verifyNotificationSignature } from '../src/lib/midtrans.js';

const fetchMock = vi.fn();
const orderId = 'mid-12345678-1234-1234-1234-123456789abc';
const transaction = { token: 'token-test', redirect_url: 'https://app.sandbox.midtrans.com/snap/v4/redirection/token-test' };
beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });
afterEach(() => vi.unstubAllGlobals());

describe('Midtrans Snap service', () => {
  it('creates sandbox checkout using backend key and expected QRIS-only order', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(transaction), { status: 201 }));
    const result = await createSession({ referenceId: orderId, bookingId: 7, customerId: 3, amount: 150000, method: 'qris' });
    expect(result).toEqual({ sessionId: orderId, checkoutUrl: transaction.redirect_url, expiresAt: null });
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://app.sandbox.midtrans.com/snap/v1/transactions');
    expect(options.headers.Authorization).toBe(`Basic ${Buffer.from('SB-server-test:').toString('base64')}`);
    expect(JSON.parse(options.body)).toMatchObject({ transaction_details: { order_id: orderId, gross_amount: 150000 }, enabled_payments: ['other_qris'] });
    expect(options.redirect).toBe('error');
  });

  it.each([401, 403])('reports provider authentication failure %s explicitly', async (status) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'Unauthorized' }), { status }));
    await expect(createSession({ referenceId: orderId, bookingId: 7, customerId: 3, amount: 150000, method: 'qris' }))
      .rejects.toMatchObject({ statusCode: 502, code: 'MIDTRANS_AUTH_FAILED' });
    await expect(readSession(orderId)).rejects.toMatchObject({ code: 'MIDTRANS_AUTH_FAILED' });
  });

  it.each(['gopay', 'dana'] as const)('rejects non-QRIS checkout method %s', async (method) => {
    await expect(createSession({ referenceId: orderId, bookingId: 7, customerId: 3, amount: 150000, method }))
      .rejects.toMatchObject({ code: 'INVALID_PAYMENT_AMOUNT' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not allow channel to be switched through unvalidated input', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(transaction), { status: 201 }));
    await expect(createSession({ referenceId: orderId, bookingId: 7, customerId: 3, amount: 150000, method: 'cash' as never }))
      .rejects.toMatchObject({ code: 'INVALID_PAYMENT_AMOUNT' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an untrusted redirect URL', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ...transaction, redirect_url: 'https://attacker.example/steal' }), { status: 201 }));
    await expect(createSession({ referenceId: orderId, bookingId: 7, customerId: 3, amount: 150000, method: 'qris' }))
      .rejects.toMatchObject({ code: 'MIDTRANS_INVALID_RESPONSE' });
  });

  it('maps only authoritative settled status to completed', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ order_id: orderId, status_code: '200', gross_amount: '150000.00', currency: 'IDR', transaction_status: 'settlement' }), { status: 200 }));
    await expect(readSession(orderId)).resolves.toMatchObject({ status: 'COMPLETED', amount: 150000, currency: 'IDR' });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ order_id: orderId, status_code: '201', gross_amount: '150000.00', currency: 'IDR', transaction_status: 'pending' }), { status: 200 }));
    await expect(readSession(orderId)).resolves.toMatchObject({ status: 'ACTIVE' });
  });

  it('verifies Midtrans signature from exact order, status code, amount, and key', () => {
    const body = { order_id: orderId, status_code: '200', gross_amount: '150000.00', signature_key: createHash('sha512').update(`${orderId}200150000.00SB-server-test`).digest('hex') };
    expect(verifyNotificationSignature(body)).toBe(true);
    expect(verifyNotificationSignature({ ...body, signature_key: body.signature_key.toUpperCase() })).toBe(true);
    expect(verifyNotificationSignature({ ...body, gross_amount: '1.00' })).toBe(false);
    for (const signature_key of [
      'not-a-signature', body.signature_key.slice(0, -1), `g${body.signature_key.slice(1)}`,
      `${body.signature_key}garbage`, `${body.signature_key}a`, `${body.signature_key}00`, `${body.signature_key}\n`,
    ]) {
      expect(verifyNotificationSignature({ ...body, signature_key })).toBe(false);
    }
  });
});
