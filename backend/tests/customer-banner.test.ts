import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const bannerModel = vi.hoisted(() => ({
  listBanners: vi.fn(),
}));
vi.mock('../src/model/banner.model.js', () => bannerModel);

import { createApp } from '../src/app.js';
import { createAccessToken } from '../src/lib/jwt.js';

const app = createApp();
const customerToken = createAccessToken({ id: 10, email: 'c@e.com', role: 'customer' } as never);
const adminToken = createAccessToken({ id: 1, email: 'a@e.com', role: 'admin' } as never);

beforeEach(() => {
  bannerModel.listBanners.mockReset();
  bannerModel.listBanners.mockResolvedValue([{ id: '52', imageUrl: '/uploads/banner.png' }]);
});

describe('customer banners', () => {
  it('requires auth', async () => {
    expect((await request(app).get('/api/customer/banners')).status).toBe(401);
  });

  it('rejects admin', async () => {
    expect(
      (await request(app).get('/api/customer/banners').set('Authorization', `Bearer ${adminToken}`)).status,
    ).toBe(403);
  });

  it('lists banners for the customer app', async () => {
    const response = await request(app)
      .get('/api/customer/banners')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([{ id: '52', imageUrl: '/uploads/banner.png' }]);
  });
});
