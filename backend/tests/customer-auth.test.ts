import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const userModel = vi.hoisted(() => ({
  isTokenRevoked: vi.fn().mockResolvedValue(false),
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  findUserByPhone: vi.fn(),
  insertCustomer: vi.fn(),
  findOrCreateSocialCustomer: vi.fn(),
  updateUserPassword: vi.fn(),
}));

vi.mock('../src/model/user.model.js', () => userModel);

import { createApp } from '../src/app.js';
import { createAccessToken, createResetToken } from '../src/lib/jwt.js';

const app = createApp();
let customerPasswordHash: string;

beforeAll(async () => {
  customerPasswordHash = await bcrypt.hash('321321', 4);
});

beforeEach(() => {
  userModel.findUserByEmail.mockReset();
  userModel.findUserById.mockReset();
  userModel.findUserByPhone.mockReset();
  userModel.insertCustomer.mockReset();
  userModel.findOrCreateSocialCustomer.mockReset();
  userModel.updateUserPassword.mockReset();
  userModel.isTokenRevoked.mockReset();
  userModel.isTokenRevoked.mockResolvedValue(false);
});

describe('customer authentication contract', () => {
  it('allows customer login by Indonesian phone number', async () => {
    userModel.findUserByPhone.mockResolvedValue({
      id: 10,
      name: 'Pelanggan Setia',
      email: 'pelanggan@cleango.id',
      phone: '081234567890',
      passwordHash: customerPasswordHash,
      role: 'customer',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app).post('/api/customer/auth/login').send({
      phone: '081234567890',
      password: '321321',
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login berhasil');
    expect(response.body.data.user.phone).toBe('081234567890');
    expect(response.body.data.token).toBeDefined();
  });

  it('allows customer login by email', async () => {
    userModel.findUserByEmail.mockResolvedValue({
      id: 10,
      name: 'Pelanggan Email',
      email: 'pelanggan@cleango.id',
      phone: '081234567890',
      passwordHash: customerPasswordHash,
      role: 'customer',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app).post('/api/customer/auth/login').send({
      email: 'pelanggan@cleango.id',
      password: '321321',
    });

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe('pelanggan@cleango.id');
  });

  it('rejects admin credentials from logging into customer mobile endpoint', async () => {
    userModel.findUserByEmail.mockResolvedValue({
      id: 1,
      name: 'CleanGo Admin',
      email: 'admin@cleango.id',
      phone: null,
      passwordHash: customerPasswordHash,
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app).post('/api/customer/auth/login').send({
      email: 'admin@cleango.id',
      password: '321321',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Nomor telepon/email atau password salah');
  });

  it('requires phone number for customer registration', async () => {
    const response = await request(app).post('/api/customer/auth/register').send({
      name: 'User Baru',
      email: 'baru@example.com',
      password: 'Password123',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Nomor telepon wajib diisi');
  });

  it('rejects passwords shorter than 8 characters on registration', async () => {
    const response = await request(app).post('/api/customer/auth/register').send({
      name: 'User Baru', phone: '081234567890', password: '1234567',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Password minimal 8 karakter');
  });

  it('returns reset token in development for registered customer', async () => {
    userModel.findUserByPhone.mockResolvedValue({
      id: 10,
      name: 'Customer',
      email: 'customer@example.com',
      phone: '081234567890',
      passwordHash: customerPasswordHash,
      role: 'customer',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app).post('/api/customer/auth/forgot-password').send({
      phone: '081234567890',
    });

    expect(response.status).toBe(200);
    expect(response.body.data?.resetToken).toBeDefined();
  });

  it('does not leak existence for unregistered phone on forgot-password', async () => {
    userModel.findUserByPhone.mockResolvedValue(null);

    const response = await request(app).post('/api/customer/auth/forgot-password').send({
      phone: '081999999999',
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toBeUndefined();
  });

  it('resets password when given valid reset token', async () => {
    const validResetToken = createResetToken(10);
    userModel.findUserById.mockResolvedValue({
      id: 10,
      name: 'Customer',
      email: 'customer@example.com',
      phone: '081234567890',
      passwordHash: customerPasswordHash,
      role: 'customer',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app).post('/api/customer/auth/reset-password').send({
      token: validResetToken,
      newPassword: 'PasswordBaru123',
    });

    expect(response.status).toBe(200);
    expect(userModel.updateUserPassword).toHaveBeenCalledWith(10, expect.any(String));
  });

  it('rejects passwords shorter than 8 characters on reset', async () => {
    const response = await request(app).post('/api/customer/auth/reset-password').send({
      token: createResetToken(10), newPassword: '1234567',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Password baru minimal 8 karakter');
    expect(userModel.updateUserPassword).not.toHaveBeenCalled();
  });

  it('rejects access token as reset token (purpose mismatch)', async () => {
    const accessToken = createAccessToken({
      id: 10,
      email: 'c@example.com',
      role: 'customer',
    } as any);

    const response = await request(app).post('/api/customer/auth/reset-password').send({
      token: accessToken,
      newPassword: 'PasswordBaru123',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Token reset tidak valid atau sudah kedaluwarsa');
  });

  it('rejects Google social login without an ID token', async () => {
    const response = await request(app).post('/api/customer/auth/social-login').send({
      provider: 'google',
      email: 'pelanggan@gmail.com',
      name: 'Pelanggan Google',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Google ID token wajib diisi');
    expect(userModel.findOrCreateSocialCustomer).not.toHaveBeenCalled();
  });

  it('rejects invalid Google ID tokens', async () => {
    const previousClientId = process.env.GOOGLE_CLIENT_ID;
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
    try {
      const response = await request(app).post('/api/customer/auth/social-login').send({
        provider: 'google',
        email: 'pelanggan@gmail.com',
        name: 'Pelanggan Google',
        idToken: 'not-a-valid-google-token',
      });

      expect(response.status).toBe(401);
      expect(userModel.findOrCreateSocialCustomer).not.toHaveBeenCalled();
    } finally {
      if (previousClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
      else process.env.GOOGLE_CLIENT_ID = previousClientId;
    }
  });

  it('rejects Facebook social login without an access token', async () => {
    const response = await request(app).post('/api/customer/auth/social-login').send({
      provider: 'facebook',
      email: 'pelanggan@facebook.com',
      name: 'Pelanggan Facebook',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Facebook access token wajib diisi');
    expect(userModel.findOrCreateSocialCustomer).not.toHaveBeenCalled();
  });

  it('rejects unsupported social provider', async () => {
    const response = await request(app).post('/api/customer/auth/social-login').send({
      provider: 'twitter',
      email: 'pelanggan@example.com',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Provider harus google atau facebook');
  });

  it('rejects social login that resolves to an admin account', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('debug_token')) {
        return {
          ok: true,
          json: async () => ({ data: { is_valid: true, app_id: 'test-fb-id' } }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ id: '123', name: 'Admin', email: 'admin@cleango.id' }),
      } as Response;
    });

    process.env.FACEBOOK_APP_ID = 'test-fb-id';
    process.env.FACEBOOK_APP_SECRET = 'test-fb-secret';

    try {
      userModel.findOrCreateSocialCustomer.mockResolvedValue({
        id: 1,
        name: 'CleanGo Admin',
        email: 'admin@cleango.id',
        phone: null,
        passwordHash: 'x',
        role: 'admin',
        authProvider: 'google',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app).post('/api/customer/auth/social-login').send({
        provider: 'facebook',
        accessToken: 'fb-test-token',
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Akun ini bukan akun customer');
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.FACEBOOK_APP_ID;
      delete process.env.FACEBOOK_APP_SECRET;
    }
  });

  it('rejects customer profile access without a token', async () => {
    const response = await request(app).get('/api/customer/auth/me');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTH_REQUIRED');
  });

  it('rejects malformed access tokens', async () => {
    const response = await request(app)
      .get('/api/customer/auth/me')
      .set('Authorization', 'Bearer invalid-token');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_TOKEN');
  });

  it('rejects expired access tokens', async () => {
    const token = jwt.sign(
      { id: 10, email: 'customer@example.com', role: 'customer' },
      'cleango_dev_jwt_secret_change_later',
      { expiresIn: -1 },
    );
    const response = await request(app)
      .get('/api/customer/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_TOKEN');
  });

  it('rejects admin token from customer profile and logout endpoints', async () => {
    const adminToken = createAccessToken({ id: 1, email: 'admin@cleango.id', role: 'admin' } as any);
    const profile = await request(app).get('/api/customer/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const logout = await request(app).post('/api/customer/auth/logout').set('Authorization', `Bearer ${adminToken}`);
    expect(profile.status).toBe(403);
    expect(logout.status).toBe(403);
  });

  it('logs out authenticated customers with stateless token guidance', async () => {
    const token = createAccessToken({ id: 10, email: 'customer@example.com', role: 'customer' } as any);
    const response = await request(app).post('/api/customer/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.message).toContain('hapus token');
  });
});

describe('token revocation after a password change', () => {
  const token = () =>
    createAccessToken({ id: 10, email: 'c@e.com', role: 'customer' } as never);

  it('rejects a token issued before the password change', async () => {
    userModel.isTokenRevoked.mockResolvedValue(true);
    const response = await request(app)
      .get('/api/customer/profile')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('SESSION_REVOKED');
  });

  it('does not bypass revocation checks when the database is unavailable', async () => {
    userModel.isTokenRevoked.mockRejectedValue(new Error('database unavailable'));
    const response = await request(app)
      .get('/api/customer/profile')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(503);
    expect(response.body.code).toBe('AUTH_UNAVAILABLE');
    expect(userModel.findUserById).not.toHaveBeenCalled();
    expect(JSON.stringify(response.body)).not.toContain('database unavailable');
  });

  it('accepts a token issued after the password change', async () => {
    userModel.findUserById.mockResolvedValue({
      id: 10,
      name: 'C',
      email: 'c@e.com',
      phone: '0812',
      role: 'customer',
      passwordHash: 'x',
      isActive: true,
    });
    const response = await request(app)
      .get('/api/customer/profile')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
  });
});
