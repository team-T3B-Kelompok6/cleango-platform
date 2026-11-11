import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const registerMock = vi.hoisted(() => vi.fn());
const unregisterMock = vi.hoisted(() => vi.fn());
const authUser = vi.hoisted(() => ({ id: 1 as number | undefined, role: 'customer' as string }));

vi.mock('../src/middleware/auth.middleware.js', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    if (authUser.value.id === undefined) {
      const err: any = new Error('Identitas tidak ada.');
      err.statusCode = 401;
      err.code = 'IDENTITY_MISSING';
      next(err);
      return;
    }
    req.user = { id: authUser.value.id, role: authUser.value.role };
    next();
  },
  requireCustomer: (req: any, _res: any, next: any) => {
    if (!req.user || req.user.role !== 'customer') {
      const err: any = new Error('Role harus customer.');
      err.statusCode = req.user ? 403 : 401;
      err.code = req.user ? 'ROLE_NOT_CUSTOMER' : 'IDENTITY_MISSING';
      next(err);
      return;
    }
    next();
  },
}));

vi.mock('../src/model/customer-push-device.model.js', () => ({
  registerPushDevice: registerMock,
  unregisterPushDevice: unregisterMock,
}));

import { customerPushDeviceRouter } from '../src/routes/customer/push-device.routes.js';

const app = express();
app.use(express.json());
app.use('/notifications/devices', customerPushDeviceRouter);
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err?.statusCode ?? 500).json({
    success: false,
    error: { code: err?.code ?? 'INTERNAL', message: err?.message ?? 'Internal error' },
  });
});

beforeEach(() => {
  vi.resetAllMocks();
  authUser.value = { id: 1, role: 'customer' };
});

const validToken = 'a'.repeat(32);

describe('POST /notifications/devices', () => {
  it('mengembalikan {success:true} dan memanggil model untuk pelanggan valid', async () => {
    registerMock.mockResolvedValue(undefined);
    const res = await request(app).post('/notifications/devices').send({ token: validToken, platform: 'android' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(registerMock).toHaveBeenCalledWith(1, validToken);
  });

  it('menggunakan userId dari JWT sebagai pemilik', async () => {
    authUser.value = { id: 42, role: 'customer' };
    registerMock.mockResolvedValue(undefined);
    const token = 'b'.repeat(40);
    await request(app).post('/notifications/devices').send({ token });
    expect(registerMock).toHaveBeenCalledWith(42, token);
  });

  it('mengembalikan 401 saat identitas tidak ada', async () => {
    authUser.value = { id: undefined, role: 'customer' };
    registerMock.mockResolvedValue(undefined);
    const res = await request(app).post('/notifications/devices').send({ token: validToken });
    expect(res.status).toBe(401);
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('menolak role admin dengan 403', async () => {
    authUser.value = { id: 7, role: 'admin' };
    registerMock.mockResolvedValue(undefined);
    const res = await request(app).post('/notifications/devices').send({ token: validToken });
    expect(res.status).toBe(403);
    expect(registerMock).not.toHaveBeenCalled();
  });

  it.each([
    [{}],
    [{ token: 'short' }],
    [{ token: ' '.repeat(40) }],
    [{ token: 'z'.repeat(4097) }],
    [{ token: validToken, owner: 'x' }],
    [{ token: validToken, platform: 'ios' }],
    [{ token: validToken, salah: 1 }],
  ])('mengembalikan 400 untuk body invalid %p', async (body) => {
    registerMock.mockResolvedValue(undefined);
    const res = await request(app).post('/notifications/devices').send(body);
    expect(res.status).toBe(400);
    expect(registerMock).not.toHaveBeenCalled();
  });
});

describe('DELETE /notifications/devices', () => {
  it('mengembalikan {success:true} dan memanggil model', async () => {
    unregisterMock.mockResolvedValue(undefined);
    const res = await request(app).delete('/notifications/devices').send({ token: validToken });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(unregisterMock).toHaveBeenCalledWith(1, validToken);
  });

  it('menggunakan userId dari JWT untuk unregister', async () => {
    authUser.value = { id: 99, role: 'customer' };
    unregisterMock.mockResolvedValue(undefined);
    const token = 'c'.repeat(36);
    await request(app).delete('/notifications/devices').send({ token });
    expect(unregisterMock).toHaveBeenCalledWith(99, token);
  });

  it('mengembalikan 401 saat identitas tidak ada', async () => {
    authUser.value = { id: undefined, role: 'customer' };
    unregisterMock.mockResolvedValue(undefined);
    const res = await request(app).delete('/notifications/devices').send({ token: validToken });
    expect(res.status).toBe(401);
    expect(unregisterMock).not.toHaveBeenCalled();
  });

  it('menolak role admin dengan 403', async () => {
    authUser.value = { id: 7, role: 'admin' };
    unregisterMock.mockResolvedValue(undefined);
    const res = await request(app).delete('/notifications/devices').send({ token: validToken });
    expect(res.status).toBe(403);
    expect(unregisterMock).not.toHaveBeenCalled();
  });

  it.each([
    [{ token: 'short' }],
    [{ token: ' '.repeat(40) }],
    [{ token: 'z'.repeat(4097) }],
    [{ token: validToken, platform: 'android' }],
    [{ owner: 'x' }],
  ])('mengembalikan 400 untuk body invalid %p', async (body) => {
    unregisterMock.mockResolvedValue(undefined);
    const res = await request(app).delete('/notifications/devices').send(body);
    expect(res.status).toBe(400);
    expect(unregisterMock).not.toHaveBeenCalled();
  });
});
