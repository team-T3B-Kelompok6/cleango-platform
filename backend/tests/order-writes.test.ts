import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const orderModel = vi.hoisted(() => ({
  ORDER_STATUSES: [
    'Menunggu Assign',
    'Menunggu Lokasi',
    'Menuju Lokasi',
    'Sedang Dikerjakan',
    'Selesai',
    'Batal',
  ],
  deleteBookingById: vi.fn(),
  findOrder: vi.fn(),
  insertBooking: vi.fn(),
  listOrders: vi.fn(),
  updateBookingById: vi.fn(),
}));
const db = vi.hoisted(() => ({ pool: { query: vi.fn(), execute: vi.fn() } }));

vi.mock('../src/model/order.model.js', () => orderModel);
vi.mock('../src/model/user.model.js', () => ({
  isTokenRevoked: vi.fn().mockResolvedValue(false),
}));
vi.mock('../src/lib/db.js', () => db);

import { createApp } from '../src/app.js';

const app = createApp();
const secret = process.env.JWT_SECRET ?? 'cleango-development-only';
const adminToken = jwt.sign({ id: 1, email: 'a@e.com', role: 'admin' }, secret);
const customerToken = jwt.sign({ id: 10, email: 'c@e.com', role: 'customer' }, secret);

beforeEach(() => {
  Object.values(orderModel).forEach((mock: unknown) => {
    if (mock && typeof (mock as { mockReset?: unknown }).mockReset === 'function') {
      (mock as ReturnType<typeof vi.fn>).mockReset();
    }
  });
  db.pool.query.mockReset();
  db.pool.execute.mockReset();
  db.pool.query.mockResolvedValue([[{ id: 10 }], []]);
  orderModel.listOrders.mockResolvedValue([]);
  orderModel.findOrder.mockResolvedValue(null);
  orderModel.deleteBookingById.mockResolvedValue('deleted');
});

describe('admin order writes', () => {
  it('forbids anonymous order creation', async () => {
    expect((await request(app).post('/api/orders')).status).toBe(401);
  });

  it('forbids a customer token from writing orders', async () => {
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({});
    expect(response.status).toBe(403);
    expect(orderModel.insertBooking).not.toHaveBeenCalled();
  });

  it('rejects an unknown status before database access', async () => {
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customer: 'Budi',
        service: 'Deep Cleaning',
        date: '2026-10-20',
        time: '09:00',
        price: 180000,
        status: 'Nilaingawur',
        notes: '',
      });
    expect(response.status).toBe(400);
    expect(orderModel.insertBooking).not.toHaveBeenCalled();
  });

  it('rejects a negative price', async () => {
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customer: 'Budi',
        service: 'Deep Cleaning',
        date: '2026-10-20',
        time: '09:00',
        price: -1,
        status: 'Menunggu Assign',
        notes: '',
      });
    expect(response.status).toBe(400);
  });

  it('rejects an unknown customer', async () => {
    db.pool.query.mockResolvedValue([[], []]);
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customer: 'Ghost',
        service: 'Deep Cleaning',
        date: '2026-10-20',
        time: '09:00',
        price: 180000,
        status: 'Menunggu Assign',
        notes: '',
      });
    expect(response.status).toBe(400);
    expect(orderModel.insertBooking).not.toHaveBeenCalled();
  });

  it('creates an order for a known customer', async () => {
    orderModel.insertBooking.mockResolvedValue({ id: '5' });
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customer: 'Budi',
        service: 'Deep Cleaning',
        date: '2026-10-20',
        time: '09:00',
        price: 180000,
        status: 'Menunggu Assign',
        notes: 'Pakai elevator',
      });
    expect(response.status).toBe(201);
    expect(orderModel.insertBooking).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 10, price: 180000 }),
    );
  });

  it('patches an existing order', async () => {
    orderModel.findOrder.mockResolvedValue({ id: '5' });
    orderModel.updateBookingById.mockResolvedValue({ id: '5', status: 'Selesai' });
    const response = await request(app)
      .patch('/api/orders/5')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Selesai' });
    expect(response.status).toBe(200);
    expect(orderModel.updateBookingById).toHaveBeenCalledWith(5, {
      status: 'Selesai',
    });
  });

  it('returns 404 when patching a missing order', async () => {
    orderModel.updateBookingById.mockResolvedValue(null);
    const response = await request(app)
      .patch('/api/orders/5')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Selesai' });
    expect(response.status).toBe(404);
  });

  it('deletes an order', async () => {
    const response = await request(app)
      .delete('/api/orders/5')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    expect(orderModel.deleteBookingById).toHaveBeenCalledWith(5);
  });
});

describe('resource categories', () => {
  it('forbids anonymous category listing', async () => {
    expect((await request(app).get('/api/categories')).status).toBe(401);
  });

  it('rejects an unknown resource filter', async () => {
    const response = await request(app)
      .get('/api/categories?resource=promo')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(400);
  });
});
describe('order deletion rules', () => {
  const remove = (path: string) =>
    request(app).delete(path).set('Authorization', `Bearer ${adminToken}`);

  it('deletes a finished order', async () => {
    orderModel.deleteBookingById.mockResolvedValue('deleted');
    const response = await remove('/api/orders/5');
    expect(response.status).toBe(200);
  });

  it('refuses to delete an order that is not finished', async () => {
    orderModel.deleteBookingById.mockResolvedValue('not_finished');
    const response = await remove('/api/orders/5');
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('ORDER_NOT_FINISHED');
  });

  it('404s for a missing order', async () => {
    orderModel.deleteBookingById.mockResolvedValue('not_found');
    const response = await remove('/api/orders/999');
    expect(response.status).toBe(404);
  });
});
