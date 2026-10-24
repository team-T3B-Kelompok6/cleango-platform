import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/model/user.model.js', async (original) => ({
  ...(await original<typeof import('../src/model/user.model.js')>()),
  isTokenRevoked: vi.fn().mockResolvedValue(false),
}));

const customerModel = vi.hoisted(() => ({
  listCustomers: vi.fn(),
  findCustomer: vi.fn(),
  updateCustomerById: vi.fn(),
  deleteCustomerById: vi.fn(),
}));
vi.mock('../src/model/customer.model.js', () => customerModel);

import { createApp } from '../src/app.js';
import { createAccessToken } from '../src/lib/jwt.js';

const app = createApp();
const adminToken = createAccessToken({ id: 1, email: 'a@e.com', role: 'admin' } as never);
const patch = (body: unknown) =>
  request(app)
    .patch('/api/customers/5')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(body as object);

beforeEach(() => {
  customerModel.updateCustomerById.mockReset();
  customerModel.findCustomer.mockResolvedValue({ id: '5', name: 'Pelanggan', address: '' });
  customerModel.updateCustomerById.mockImplementation(async (_id: number, input: Record<string, unknown>) => ({
    id: '5',
    name: 'Pelanggan',
    ...input,
  }));
});

describe('admin customer address update', () => {
  it('forwards a new address', async () => {
    const response = await patch({ address: 'Jl. Baru No. 1' });
    expect(response.status).toBe(200);
    expect(customerModel.updateCustomerById).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ address: 'Jl. Baru No. 1' }),
    );
  });

  it('allows clearing the address with an empty string', async () => {
    const response = await patch({ address: '' });
    expect(response.status).toBe(200);
    expect(customerModel.updateCustomerById).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ address: '' }),
    );
  });

  it('trims the address', async () => {
    await patch({ address: '   Jl. Spasi   ' });
    expect(customerModel.updateCustomerById).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ address: 'Jl. Spasi' }),
    );
  });

  it('leaves the address untouched when the field is absent', async () => {
    await patch({ name: 'Nama Baru' });
    const input = customerModel.updateCustomerById.mock.calls[0]![1] as Record<string, unknown>;
    expect('address' in input).toBe(false);
  });

  it('rejects an overlong address', async () => {
    const response = await patch({ address: 'a'.repeat(1001) });
    expect(response.status).toBe(400);
    expect(customerModel.updateCustomerById).not.toHaveBeenCalled();
  });

  it('rejects a non-string address', async () => {
    const response = await patch({ address: 123 });
    expect(response.status).toBe(400);
    expect(customerModel.updateCustomerById).not.toHaveBeenCalled();
  });
});
