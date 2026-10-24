import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/model/user.model.js', async (original) => ({
  ...(await original<typeof import('../src/model/user.model.js')>()),
  isTokenRevoked: vi.fn().mockResolvedValue(false),
}));

const serviceModel = vi.hoisted(() => ({
  SERVICE_SORTS: ['name', 'price', 'category', 'newest'],
  listPlatformServices: vi.fn(),
  insertPlatformService: vi.fn(),
  updatePlatformService: vi.fn(),
}));
vi.mock('../src/model/platform-service.model.js', () => serviceModel);

import { createApp } from '../src/app.js';
import { createAccessToken } from '../src/lib/jwt.js';

const app = createApp();
const adminToken = createAccessToken({ id: 1, email: 'a@e.com', role: 'admin' } as never);
const post = (body: unknown) =>
  request(app).post('/api/services').set('Authorization', `Bearer ${adminToken}`).send(body as object);
const patch = (body: unknown) =>
  request(app).patch('/api/services/1').set('Authorization', `Bearer ${adminToken}`).send(body as object);

const base = {
  name: 'Layanan',
  category: 'Rumah',
  duration: '2 jam',
  price: 100000,
  description: 'Deskripsi',
  features: [],
  active: true,
};

beforeEach(() => {
  serviceModel.insertPlatformService.mockReset();
  serviceModel.updatePlatformService.mockReset();
  serviceModel.insertPlatformService.mockImplementation(async (input: Record<string, unknown>) => ({
    id: '1',
    ...input,
  }));
  serviceModel.updatePlatformService.mockImplementation(async (_id: number, input: Record<string, unknown>) => ({
    id: '1',
    ...input,
  }));
});

describe('service image upload round-trip', () => {
  it('stores a local /uploads path', async () => {
    const response = await post({ ...base, imageUrl: '/uploads/foto.png' });
    expect(response.status).toBe(201);
    expect(response.body.data.imageUrl).toBe('/uploads/foto.png');
  });

  it('stores an absolute http url', async () => {
    const response = await post({ ...base, imageUrl: 'https://cdn.example.com/a.png' });
    expect(response.status).toBe(201);
    expect(serviceModel.insertPlatformService).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: 'https://cdn.example.com/a.png' }),
    );
  });

  it('treats a blank value as no image', async () => {
    const response = await post({ ...base, imageUrl: '   ' });
    expect(response.status).toBe(201);
    expect(serviceModel.insertPlatformService).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: null }),
    );
  });

  it('allows clearing the image with null on update', async () => {
    const response = await patch({ imageUrl: null });
    expect(response.status).toBe(200);
    expect(serviceModel.updatePlatformService).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ imageUrl: null }),
    );
  });

  it('rejects a javascript: url before touching the database', async () => {
    const response = await post({ ...base, imageUrl: 'javascript:alert(1)' });
    expect(response.status).toBe(400);
    expect(response.body.errors.imageUrl).toBeDefined();
    expect(serviceModel.insertPlatformService).not.toHaveBeenCalled();
  });

  it('rejects a protocol-relative url', async () => {
    const response = await post({ ...base, imageUrl: '//evil.example/x.png' });
    expect(response.status).toBe(400);
    expect(serviceModel.insertPlatformService).not.toHaveBeenCalled();
  });

  it('rejects an overlong url', async () => {
    const response = await post({ ...base, imageUrl: '/' + 'a'.repeat(500) });
    expect(response.status).toBe(400);
    expect(serviceModel.insertPlatformService).not.toHaveBeenCalled();
  });
});
