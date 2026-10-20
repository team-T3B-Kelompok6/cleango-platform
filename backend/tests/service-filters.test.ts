import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const serviceModel = vi.hoisted(() => ({
  SERVICE_CATEGORY_DATABASE_NAMES: {
    Rumah: 'Rumah',
    Kantor: 'Kantor',
    Sofa: 'Sofa dan Kasur',
    AC: 'AC',
  },
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

  it('rejects an unknown category value', async () => {
    const response = await get('/api/services?category=Gudang');
    expect(response.status).toBe(400);
    expect(response.body.errors.category).toBe('Kategori layanan tidak valid.');
    expect(serviceModel.listPlatformServices).not.toHaveBeenCalled();
  });

  it('rejects an overlong search term', async () => {
    const response = await get(`/api/services?search=${'a'.repeat(101)}`);
    expect(response.status).toBe(400);
    expect(serviceModel.listPlatformServices).not.toHaveBeenCalled();
  });
});
