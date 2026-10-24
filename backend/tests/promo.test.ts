import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/model/user.model.js', async (original) => ({
  ...(await original<typeof import('../src/model/user.model.js')>()),
  isTokenRevoked: vi.fn().mockResolvedValue(false),
}));
import jwt from 'jsonwebtoken';

const promoModel = vi.hoisted(() => ({
  deletePromoById: vi.fn(),
  findPromo: vi.fn(),
  findPromoByCode: vi.fn(),
  insertPromo: vi.fn(),
  listPromos: vi.fn(),
  updatePromoById: vi.fn(),
}));

vi.mock('../src/model/promo.model.js', () => promoModel);

import { createApp } from '../src/app.js';

const app = createApp();
const secret = process.env.JWT_SECRET ?? 'cleango-development-only';
const adminToken = jwt.sign({ id: 1, email: 'a@e.com', role: 'admin' }, secret);
const customerToken = jwt.sign({ id: 10, email: 'c@e.com', role: 'customer' }, secret);

const valid = {
  name: 'Diskon Awal Bulan',
  code: 'AWAL20',
  discountType: 'percentage',
  discountValue: 20,
  maxDiscount: 50000,
  minPurchase: 100000,
  scope: 'all',
  serviceIds: [],
  startsOn: '2026-10-01',
  endsOn: '2026-10-31',
  usageLimit: 100,
  perCustomerLimit: 1,
  stackable: false,
  active: true,
};

beforeEach(() => {
  Object.values(promoModel).forEach((mock: unknown) => {
    if (mock && typeof (mock as { mockReset?: unknown }).mockReset === 'function') {
      (mock as ReturnType<typeof vi.fn>).mockReset();
    }
  });
  promoModel.listPromos.mockResolvedValue([]);
  promoModel.findPromo.mockResolvedValue(null);
  promoModel.findPromoByCode.mockResolvedValue(null);
  promoModel.deletePromoById.mockResolvedValue(true);
  promoModel.insertPromo.mockResolvedValue({ id: '1', ...valid });
});

describe('admin promo', () => {
  it('forbids anonymous listing', async () => {
    expect((await request(app).get('/api/promos')).status).toBe(401);
  });

  it('forbids a customer token from managing promos', async () => {
    const response = await request(app)
      .post('/api/promos')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(valid);
    expect(response.status).toBe(403);
    expect(promoModel.insertPromo).not.toHaveBeenCalled();
  });

  it('rejects a percentage above 100', async () => {
    const response = await request(app)
      .post('/api/promos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...valid, discountValue: 200 });
    expect(response.status).toBe(400);
  });

  it('rejects an ends date before starts date', async () => {
    const response = await request(app)
      .post('/api/promos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...valid, endsOn: '2026-09-01' });
    expect(response.status).toBe(400);
  });

  it('rejects a services scope without service ids', async () => {
    const response = await request(app)
      .post('/api/promos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...valid, scope: 'services', serviceIds: [] });
    expect(response.status).toBe(400);
  });

  it('rejects a duplicate code', async () => {
    promoModel.findPromoByCode.mockResolvedValue({ id: '9', code: 'AWAL20' });
    const response = await request(app)
      .post('/api/promos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(valid);
    expect(response.status).toBe(400);
    expect(promoModel.insertPromo).not.toHaveBeenCalled();
  });

  it('ignores maxDiscount for a fixed discount', async () => {
    await request(app)
      .post('/api/promos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...valid, discountType: 'fixed', maxDiscount: 50000 });
    expect(promoModel.insertPromo).toHaveBeenCalledWith(
      expect.objectContaining({ maxDiscount: null }),
    );
  });

  it('creates a valid percentage promo', async () => {
    const response = await request(app)
      .post('/api/promos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(valid);
    expect(response.status).toBe(201);
    expect(promoModel.insertPromo).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'AWAL20', scope: 'all', serviceIds: [] }),
    );
  });

  it('allows keeping the same code when patching itself', async () => {
    promoModel.findPromoByCode.mockResolvedValue({ id: '1', code: 'AWAL20' });
    promoModel.updatePromoById.mockResolvedValue({ id: '1', ...valid });
    const response = await request(app)
      .patch('/api/promos/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'AWAL20', minPurchase: 150000 });
    expect(response.status).toBe(200);
  });

  it('rejects taking another promo code', async () => {
    promoModel.findPromoByCode.mockResolvedValue({ id: '2', code: 'LAIN' });
    const response = await request(app)
      .patch('/api/promos/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'LAIN' });
    expect(response.status).toBe(400);
  });

  it('deletes a promo', async () => {
    const response = await request(app)
      .delete('/api/promos/1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
  });
});
