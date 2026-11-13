import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
  readSession: vi.fn(),
  apply: vi.fn(),
}));
vi.mock('../src/config/env.js', () => ({ getEnv: () => ({
  XENDIT_WEBHOOK_TOKEN: 'test-callback-token', FRONTEND_ORIGIN: 'http://localhost:3000',
}) }));
vi.mock('../src/lib/xendit.js', () => ({
  verifyXenditWebhook: (token: string) => token === 'test-callback-token',
  readSession: mocks.readSession,
}));
vi.mock('../src/model/payment.model.js', () => ({ applyXenditSessionEvent: mocks.apply }));

// Small app avoids unrelated routes and never accesses a real DB or Xendit.
import express from 'express';
import { postPaymentWebhook } from '../src/controller/payment.controller.js';
import { globalErrorHandler } from '../src/middleware/error.middleware.js';
const app = express();
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), postPaymentWebhook);
app.use(globalErrorHandler);
const sessionId = 'ps-123456789012345678901234';
const payload = { event: 'payment_session.completed', data: {
  payment_session_id: sessionId, reference_id: 'cg-test', session_type: 'PAY',
} };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.readSession.mockResolvedValue({ sessionId, referenceId: 'cg-test', status: 'COMPLETED', amount: 105000 });
  mocks.apply.mockResolvedValue({ ok: true, status: 'paid' });
});

describe('Xendit webhook', () => {
  it('rejects a missing callback token before any provider or DB operation', async () => {
    const response = await request(app).post('/api/payments/webhook').send(payload);
    expect(response.status).toBe(401);
    expect(mocks.readSession).not.toHaveBeenCalled();
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it('uses server-to-server status and amount, not callback client fields', async () => {
    const response = await request(app).post('/api/payments/webhook')
      .set('x-callback-token', 'test-callback-token').send({ ...payload, amount: 1 });
    expect(response.status).toBe(200);
    expect(mocks.apply).toHaveBeenCalledWith({ sessionId, referenceId: 'cg-test', status: 'paid', amount: 105000 });
  });

  it('rejects a callback whose reference differs from the provider session', async () => {
    mocks.readSession.mockResolvedValue({ sessionId, referenceId: 'other', status: 'COMPLETED', amount: 105000 });
    const response = await request(app).post('/api/payments/webhook')
      .set('x-callback-token', 'test-callback-token').send(payload);
    expect(response.status).toBe(409);
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it('does not treat a callback as paid while provider status remains active', async () => {
    mocks.readSession.mockResolvedValue({ sessionId, referenceId: 'cg-test', status: 'ACTIVE', amount: 105000 });
    const response = await request(app).post('/api/payments/webhook')
      .set('x-callback-token', 'test-callback-token').send(payload);
    expect(response.status).toBe(200);
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it('returns retryable failure when storage does not accept the session', async () => {
    mocks.apply.mockResolvedValue({ ok: false, reason: 'AMOUNT_MISMATCH' });
    const response = await request(app).post('/api/payments/webhook')
      .set('x-callback-token', 'test-callback-token').send(payload);
    expect(response.status).toBe(409);
  });
});
