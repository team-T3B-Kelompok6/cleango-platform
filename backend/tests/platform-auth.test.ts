import bcrypt from 'bcrypt';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const userModel = vi.hoisted(() => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
}));

vi.mock('../src/model/user.model.js', () => userModel);

import { createApp } from '../src/app.js';

const app = createApp();
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await bcrypt.hash('321321', 4);
});

beforeEach(() => {
  userModel.findUserByEmail.mockReset();
  userModel.findUserById.mockReset();
});

describe('platform admin login', () => {
  it('accepts the username field used by the frontend and returns its token contract', async () => {
    userModel.findUserByEmail.mockResolvedValue({
      id: 1,
      name: 'CleanGo Admin',
      email: 'admin@cleango.id',
      phone: null,
      passwordHash,
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app).post('/api/auth/login').send({
      username: ' ADMIN@CLEANGO.ID ',
      password: '321321',
      remember: true,
    });

    expect(response.status).toBe(200);
    expect(userModel.findUserByEmail).toHaveBeenCalledWith('admin@cleango.id');
    expect(response.body).toEqual({
      accessToken: expect.any(String),
      expiresIn: 604800,
    });
  });

  it('rejects a non-admin account', async () => {
    userModel.findUserByEmail.mockResolvedValue({
      id: 2,
      name: 'Customer',
      email: 'customer@cleango.id',
      phone: null,
      passwordHash,
      role: 'customer',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app).post('/api/auth/login').send({
      username: 'customer@cleango.id',
      password: '321321',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Email atau password admin salah');
  });
});
