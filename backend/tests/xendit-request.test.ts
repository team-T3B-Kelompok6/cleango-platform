import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/env.js', () => ({ getEnv: () => ({
  XENDIT_SECRET_KEY: 'test-secret', XENDIT_WEBHOOK_TOKEN: 'test-token',
}) }));
import { createSession, readSession } from '../src/lib/xendit.js';
const fetchMock = vi.fn();
const input = { referenceId: 'cg-test', bookingId: 9, customerId: 4, amount: 105000, method: 'qris' as const };
const data = {
  payment_session_id: 'ps-123456789012345678901234', reference_id: 'cg-test', status: 'ACTIVE',
  amount: 105000, currency: 'IDR', session_type: 'PAY',
  payment_link_url: 'https://dev.xen.to/test', expires_at: '2026-12-01T00:00:00Z',
};
beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });
afterEach(() => vi.unstubAllGlobals());

describe('Xendit HTTP boundary', () => {
  it('creates an IDR hosted session with server basic auth and selected channel', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(data), { status: 201 }));
    const result = await createSession(input);
    expect(result).toEqual({ sessionId: data.payment_session_id, checkoutUrl: data.payment_link_url, expiresAt: data.expires_at });
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.xendit.co/sessions');
    expect(options.headers.Authorization).toBe(`Basic ${Buffer.from('test-secret:').toString('base64')}`);
    expect(JSON.parse(options.body)).toMatchObject({ reference_id: 'cg-test', amount: 105000, currency: 'IDR', country: 'ID', session_type: 'PAY', mode: 'PAYMENT_LINK', allowed_payment_channels: ['QRIS'] });
    expect(options.redirect).toBe('error');
  });

  it('does not send invalid amounts to the provider', async () => {
    await expect(createSession({ ...input, amount: 1.5 })).rejects.toMatchObject({ code: 'INVALID_PAYMENT_AMOUNT' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects provider responses with the wrong reference or amount', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ...data, amount: 1 }), { status: 201 }));
    await expect(createSession(input)).rejects.toMatchObject({ code: 'XENDIT_INVALID_RESPONSE' });
  });

  it('does not expose sensitive provider errors', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'test-secret personal data' }), { status: 401 }));
    await expect(createSession(input)).rejects.toMatchObject({ code: 'XENDIT_REQUEST_FAILED' });
  });

  it('rejects arbitrary session paths without making HTTP requests', async () => {
    await expect(readSession('../payments')).rejects.toMatchObject({ code: 'INVALID_PAYMENT_SESSION' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
