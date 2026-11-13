import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createHash } from 'node:crypto';

const mocks = vi.hoisted(() => ({ read: vi.fn(), apply: vi.fn(), production: false }));
vi.mock('../src/config/env.js', () => ({ getEnv: () => ({ MIDTRANS_SERVER_KEY: 'test-key', MIDTRANS_IS_PRODUCTION: mocks.production }) }));
vi.mock('../src/lib/midtrans.js', async (original) => ({
  ...await original<typeof import('../src/lib/midtrans.js')>(), readSession: mocks.read,
}));
vi.mock('../src/model/payment.model.js', () => ({ applyMidtransSessionEvent: mocks.apply, applyXenditSessionEvent: vi.fn() }));
import { postMidtransWebhook } from '../src/controller/payment.controller.js';
import { globalErrorHandler } from '../src/middleware/error.middleware.js';
const app = express();
app.post('/api/payments/webhook/midtrans', express.json(), postMidtransWebhook);
app.use(globalErrorHandler);
const orderId = 'mid-12345678-1234-1234-1234-123456789abc';
const body = { order_id: orderId, gross_amount: '150000.00', status_code: '200',
  signature_key: createHash('sha512').update(`${orderId}200150000.00test-key`).digest('hex') };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.production = false;
  mocks.read.mockResolvedValue({ sessionId: orderId, referenceId: orderId, amount: 150000, status: 'COMPLETED', currency: 'IDR' });
  mocks.apply.mockResolvedValue({ ok: true, status: 'paid' });
});

describe('Midtrans notification endpoint', () => {
  it('acknowledges Sandbox dashboard probe without touching provider or bookings', async () => {
    const probe = {
      merchant_id: 'M064328290',
      order_id: 'payment_notif_test_M064328290_dcd931d3-f459-411d-82bd-2abee5c74272',
      status_code: '200', gross_amount: '105000.00', transaction_status: 'settlement',
      signature_key: 'not-a-valid-signature',
    };
    const response = await request(app).post('/api/payments/webhook/midtrans').send(probe);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ received: true, ignored: true, test: true });
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it('rejects Sandbox probe-shaped payload in production', async () => {
    mocks.production = true;
    const response = await request(app).post('/api/payments/webhook/midtrans').send({
      merchant_id: 'M064328290',
      order_id: 'payment_notif_test_M064328290_dcd931d3-f459-411d-82bd-2abee5c74272',
      status_code: '200', gross_amount: '105000.00', signature_key: 'invalid',
    });
    expect(response.status).toBe(401);
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it('rejects forged notifications before provider or DB access', async () => {
    expect((await request(app).post('/api/payments/webhook/midtrans').send({ ...body, signature_key: 'wrong' })).status).toBe(401);
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.apply).not.toHaveBeenCalled();
  });
  it('settles only after signature and authoritative provider status', async () => {
    expect((await request(app).post('/api/payments/webhook/midtrans').send(body)).status).toBe(200);
    expect(mocks.apply).toHaveBeenCalledWith({ sessionId: orderId, referenceId: orderId, amount: 150000, status: 'paid' });
  });
  it('ignores pending even if callback claims settlement', async () => {
    mocks.read.mockResolvedValue({ sessionId: orderId, referenceId: orderId, amount: 150000, status: 'ACTIVE', currency: 'IDR' });
    expect((await request(app).post('/api/payments/webhook/midtrans').send({ ...body, transaction_status: 'settlement' })).status).toBe(200);
    expect(mocks.apply).not.toHaveBeenCalled();
  });
  it('rejects mismatched provider amount', async () => {
    mocks.read.mockResolvedValue({ sessionId: orderId, referenceId: orderId, amount: 1, status: 'COMPLETED', currency: 'IDR' });
    expect((await request(app).post('/api/payments/webhook/midtrans').send(body)).status).toBe(409);
    expect(mocks.apply).not.toHaveBeenCalled();
  });
  it('expires a canceled transaction without calling it paid', async () => {
    mocks.read.mockResolvedValue({ sessionId: orderId, referenceId: orderId, amount: 150000, status: 'CANCELED', currency: 'IDR' });
    mocks.apply.mockResolvedValue({ ok: true, status: 'expired' });
    expect((await request(app).post('/api/payments/webhook/midtrans').send(body)).status).toBe(200);
    expect(mocks.apply).toHaveBeenCalledWith(expect.objectContaining({ status: 'expired' }));
  });
});
