import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const bannerModel = vi.hoisted(() => ({
  deleteBannerById: vi.fn(),
  findBanner: vi.fn(),
  insertBanner: vi.fn(),
  listBanners: vi.fn(),
  updateBannerById: vi.fn(),
}));

vi.mock('../src/model/banner.model.js', () => bannerModel);

import { createApp } from '../src/app.js';

const app = createApp();
const secret = process.env.JWT_SECRET ?? 'cleango-development-only';
const adminToken = jwt.sign({ id: 1, email: 'a@e.com', role: 'admin' }, secret);
const customerToken = jwt.sign({ id: 10, email: 'c@e.com', role: 'customer' }, secret);

beforeEach(() => {
  Object.values(bannerModel).forEach((mock: unknown) => {
    if (mock && typeof (mock as { mockReset?: unknown }).mockReset === 'function') {
      (mock as ReturnType<typeof vi.fn>).mockReset();
    }
  });
  bannerModel.listBanners.mockResolvedValue([]);
  bannerModel.findBanner.mockResolvedValue(null);
  bannerModel.deleteBannerById.mockResolvedValue(true);
  bannerModel.insertBanner.mockResolvedValue({ id: '1', imageUrl: '/uploads/a.png' });
});

describe('admin banners', () => {
  it('forbids anonymous listing', async () => {
    expect((await request(app).get('/api/banners')).status).toBe(401);
  });

  it('forbids a customer token from managing banners', async () => {
    const response = await request(app)
      .post('/api/banners')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ imageUrl: '/uploads/a.png' });
    expect(response.status).toBe(403);
    expect(bannerModel.insertBanner).not.toHaveBeenCalled();
  });

  it('rejects a javascript url', async () => {
    const response = await request(app)
      .post('/api/banners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ imageUrl: 'javascript:alert(1)' });
    expect(response.status).toBe(400);
  });

  it('rejects a protocol relative url', async () => {
    const response = await request(app)
      .post('/api/banners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ imageUrl: '//evil.example/x.png' });
    expect(response.status).toBe(400);
  });

  it('rejects a backslash in a local path', async () => {
    const response = await request(app)
      .post('/api/banners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ imageUrl: '/uploads\\x.png' });
    expect(response.status).toBe(400);
  });

  it('rejects a missing image url', async () => {
    const response = await request(app)
      .post('/api/banners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(response.status).toBe(400);
  });

  it('accepts a local upload path', async () => {
    const response = await request(app)
      .post('/api/banners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ imageUrl: '/uploads/abc.png' });
    expect(response.status).toBe(201);
    expect(bannerModel.insertBanner).toHaveBeenCalledWith('/uploads/abc.png');
  });

  it('accepts an absolute http url', async () => {
    const response = await request(app)
      .post('/api/banners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ imageUrl: 'http://cdn.example/a.png' });
    expect(response.status).toBe(201);
  });

  it('returns 404 for a missing banner', async () => {
    const response = await request(app)
      .get('/api/banners/9')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(404);
  });

  it('deletes a banner', async () => {
    const response = await request(app)
      .delete('/api/banners/1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
  });
});

describe('image upload', () => {
  it('forbids anonymous upload', async () => {
    expect((await request(app).post('/api/uploads')).status).toBe(401);
  });

  it('rejects a non image content type', async () => {
    const response = await request(app)
      .post('/api/uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/pdf')
      .send(Buffer.from('%PDF'));
    expect(response.status).toBe(400);
  });
});

describe('malformed request body', () => {
  it('returns 400 for invalid json', async () => {
    const response = await request(app)
      .post('/api/promos')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .send('{ not json');
    expect(response.status).toBe(400);
  });
});