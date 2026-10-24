import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/model/user.model.js', async (original) => ({
  ...(await original<typeof import('../src/model/user.model.js')>()),
  isTokenRevoked: vi.fn().mockResolvedValue(false),
}));

const serviceModel = vi.hoisted(() => ({
  SERVICE_SORTS: ['name', 'price', 'category', 'newest'],
  listPlatformServices: vi.fn(),
}));
vi.mock('../src/model/platform-service.model.js', () => serviceModel);

import { createApp } from '../src/app.js';
import { createAccessToken } from '../src/lib/jwt.js';

const app = createApp();
const adminToken = createAccessToken({ id: 1, email: 'a@e.com', role: 'admin' } as never);
const get = (path: string) =>
  request(app).get(path).set('Authorization', `Bearer ${adminToken}`);

beforeEach(() => {
  serviceModel.listPlatformServices.mockReset();
  serviceModel.listPlatformServices.mockResolvedValue([]);
});

describe('GET /api/services filters and sorting', () => {
  it('passes search, category, active and sort to the model', async () => {
    const response = await get(
      '/api/services?search=basic&category=Rumah&active=true&sort=price',
    );
    expect(response.status).toBe(200);
    expect(serviceModel.listPlatformServices).toHaveBeenCalledWith({
      search: 'basic',
      category: 'Rumah',
      activeOnly: true,
      sort: 'price',
    });
  });

  it('defaults to name sorting without filters', async () => {
    const response = await get('/api/services');
    expect(response.status).toBe(200);
    expect(serviceModel.listPlatformServices).toHaveBeenCalledWith({
      search: null,
      category: null,
      activeOnly: false,
      sort: 'name',
    });
  });

  it('rejects an unknown sort value', async () => {
    const response = await get('/api/services?sort=harga');
    expect(response.status).toBe(400);
    expect(response.body.errors.sort).toBe('Pengurutan tidak valid.');
    expect(serviceModel.listPlatformServices).not.toHaveBeenCalled();
  });

  it('passes any registered category name through to the model', async () => {
    // Categories are admin-managed, so a new one (e.g. "Gudang") must be usable.
    const response = await get('/api/services?category=Gudang');
    expect(response.status).toBe(200);
    expect(serviceModel.listPlatformServices).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Gudang' }),
    );
  });

  it('rejects an empty category value', async () => {
    const response = await get('/api/services?category=' + 'a'.repeat(101));
    expect(response.status).toBe(400);
    expect(serviceModel.listPlatformServices).not.toHaveBeenCalled();
  });

  it('rejects an overlong search term', async () => {
    const response = await get(`/api/services?search=${'a'.repeat(101)}`);
    expect(response.status).toBe(400);
    expect(serviceModel.listPlatformServices).not.toHaveBeenCalled();
  });
});
