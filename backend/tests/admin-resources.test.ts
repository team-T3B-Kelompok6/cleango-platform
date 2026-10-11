import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();
const adminToken = jwt.sign(
  { id: 1, email: 'admin@cleango.id', role: 'admin' },
  process.env.JWT_SECRET ?? 'cleango-development-only',
);

const authorized = (method: 'get' | 'post' | 'patch', path: string) =>
  request(app)[method](path).set('Authorization', `Bearer ${adminToken}`);

describe('admin resource contracts', () => {
  it.each(['/api/orders', '/api/services', '/api/faqs', '/api/staff'])(
    'protects %s with admin authentication',
    async (path) => {
      const response = await request(app).get(path);
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('AUTH_REQUIRED');
    },
  );

  it('validates the frontend service category before database access', async () => {
    const response = await authorized('post', '/api/services').send({
      name: 'Tes Layanan',
      category: 'Tidak Ada',
      duration: '2 jam',
      price: 100000,
      description: 'Deskripsi layanan',
      active: true,
      features: [],
    });

    expect(response.status).toBe(400);
    expect(response.body.errors.category).toBe('Kategori layanan tidak valid.');
  });

  it('validates FAQ publication as a boolean before database access', async () => {
    const response = await authorized('patch', '/api/faqs/1').send({
      published: 'ya',
    });
    expect(response.status).toBe(400);
    expect(response.body.errors.published).toBe(
      'Status publikasi harus boolean.',
    );
  });

  it('validates the staff status before database access', async () => {
    const response = await authorized('post', '/api/staff').send({
      name: 'Petugas Tes',
      phone: '08123456789',
      area: 'Malang',
      status: 'Libur',
    });

    expect(response.status).toBe(400);
    expect(response.body.errors.status).toBe('Status petugas tidak valid.');
  });

  it.each([
    '/api/orders/bukan-id',
    '/api/services/bukan-id',
    '/api/faqs/0',
    '/api/staff/-1',
  ])('rejects an invalid resource id at %s', async (path) => {
    const response = await authorized('get', path);
    expect(response.status).toBe(400);
  });
});
