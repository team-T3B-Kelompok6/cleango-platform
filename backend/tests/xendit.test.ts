import { afterEach, describe, expect, it, vi } from 'vitest';

const originalToken = process.env.XENDIT_WEBHOOK_TOKEN;
afterEach(() => {
  vi.resetModules();
  if (originalToken === undefined) delete process.env.XENDIT_WEBHOOK_TOKEN;
  else process.env.XENDIT_WEBHOOK_TOKEN = originalToken;
});

describe('Xendit session validation', () => {
  it('rejects checkout URLs outside Xendit HTTPS hosts', async () => {
    const { isXenditCheckoutUrl } = await import('../src/lib/xendit.js');
    expect(isXenditCheckoutUrl('https://checkout.xendit.co/sessions/ps-test')).toBe(true);
    expect(isXenditCheckoutUrl('https://checkout-staging.xendit.co/sessions/ps-test')).toBe(true);
    expect(isXenditCheckoutUrl('http://checkout.xendit.co/sessions/ps-test')).toBe(false);
    expect(isXenditCheckoutUrl('https://checkout.xendit.co.attacker.example/pay')).toBe(false);
    expect(isXenditCheckoutUrl('https://attacker.example/')).toBe(false);
  });

  it('accepts only valid IDR payment sessions with safe checkout URLs', async () => {
    const { parseSession } = await import('../src/lib/xendit.js');
    expect(parseSession({
      payment_session_id: 'ps-123456789012345678901234',
      reference_id: 'cg-123',
      status: 'ACTIVE',
      amount: 150000,
      currency: 'IDR',
      session_type: 'PAY',
      payment_link_url: 'https://checkout-staging.xendit.co/sessions/ps-123456789012345678901234',
      expires_at: '2026-12-01T00:00:00Z',
    })).toMatchObject({ status: 'ACTIVE', amount: 150000, currency: 'IDR' });
    expect(() => parseSession({
      payment_session_id: 'ps-123456789012345678901234',
      reference_id: 'cg-123', status: 'ACTIVE', amount: 1, currency: 'IDR', session_type: 'PAY',
      payment_link_url: 'https://attacker.example/steal',
    })).toThrow('Data sesi Xendit tidak valid');
  });

  it('verifies the Xendit callback token with constant-time comparison', async () => {
    process.env.XENDIT_WEBHOOK_TOKEN = 'test-hook-secret';
    vi.resetModules();
    const { verifyXenditWebhook } = await import('../src/lib/xendit.js');
    expect(verifyXenditWebhook('test-hook-secret')).toBe(true);
    expect(verifyXenditWebhook('wrong-secret')).toBe(false);
    expect(verifyXenditWebhook(undefined)).toBe(false);
  });
});
