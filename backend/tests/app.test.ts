import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('CleanGo MySQL API', () => {
  it('returns health status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'CleanGo API sehat' });
  });

  it('returns JSON 404 after router', async () => {
    const response = await request(app).get('/endpoint-tidak-ada');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Endpoint tidak ditemukan' });
  });

  it('validates customer category id before database access', async () => {
    const response = await request(app).get('/api/customer/categories/bukan-id');
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('ID kategori tidak valid');
  });

  it('validates customer service id before database access', async () => {
    const response = await request(app).get('/api/customer/services/0');
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('ID layanan tidak valid');
  });

  it('rejects overly long search before database access', async () => {
    const response = await request(app).get(`/api/customer/services?search=${'a'.repeat(101)}`);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Pencarian maksimal 100 karakter');
  });

  it('rejects role injection during customer registration', async () => {
    const response = await request(app).post('/api/customer/auth/register').send({
      name: 'Test', email: 'test@example.com', password: 'Password123', role: 'admin',
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Role tidak boleh dikirim saat registrasi');
  });

  it('requires authentication for admin CRUD', async () => {
    const response = await request(app).get('/api/admin/services');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTH_REQUIRED');
  });

  it('forbids a customer token from admin CRUD', async () => {
    const token = jwt.sign(
      { id: 1, email: 'customer@example.com', role: 'customer' },
      process.env.JWT_SECRET ?? 'cleango-development-only',
    );
    const response = await request(app)
      .get('/api/admin/services')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });
});
