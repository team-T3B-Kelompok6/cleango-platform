import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const userModel = vi.hoisted(() => ({
  isTokenRevoked: vi.fn().mockResolvedValue(false),
  findUserByEmail: vi.fn(), findUserById: vi.fn(), findUserByPhone: vi.fn(),
  insertCustomer: vi.fn(), findOrCreateSocialCustomer: vi.fn(),
  updateUserPassword: vi.fn(), updateUserProfile: vi.fn(),
}));
const addressModel = vi.hoisted(() => ({
  MAX_ADDRESSES_PER_CUSTOMER: 5,
  findAddressesByUser: vi.fn(), findAddressById: vi.fn(), countAddressesByUser: vi.fn(),
  insertAddress: vi.fn(), updateAddressById: vi.fn(), deleteAddressById: vi.fn(),
}));
vi.mock('../src/model/user.model.js', () => userModel);
vi.mock('../src/model/address.model.js', () => addressModel);

import { createApp } from '../src/app.js';
import { createAccessToken } from '../src/lib/jwt.js';

const app = createApp();
const customerToken = createAccessToken({ id: 10, email: 'c@e.com', role: 'customer' } as never);
const adminToken = createAccessToken({ id: 1, email: 'a@e.com', role: 'admin' } as never);

beforeEach(() => {
  userModel.findUserById.mockReset();
  userModel.findUserByEmail.mockReset();
  userModel.updateUserProfile.mockReset();
  Object.values(addressModel).forEach((m: unknown) => { if (m && typeof (m as { mockReset?: unknown }).mockReset === 'function') (m as ReturnType<typeof vi.fn>).mockReset(); });
  addressModel.countAddressesByUser.mockResolvedValue(0);
  addressModel.findAddressesByUser.mockResolvedValue([]);
  addressModel.findAddressById.mockResolvedValue(null);
  addressModel.insertAddress.mockResolvedValue({ id: 1, label: 'Rumah', isPrimary: true });
  addressModel.updateAddressById.mockResolvedValue({ id: 1, label: 'Kantor' });
  addressModel.deleteAddressById.mockResolvedValue(true);
  userModel.findUserById.mockResolvedValue({ id: 10, name: 'C', email: 'c@e.com', phone: '0812', role: 'customer', passwordHash: 'x', isActive: true, createdAt: new Date(), updatedAt: new Date() });
  userModel.updateUserProfile.mockImplementation(async (_id: number, patch: Record<string, string>) => ({ id: 10, name: patch.name ?? 'C', email: patch.email ?? 'c@e.com', phone: patch.phone ?? '0812', role: 'customer' }));
});

describe('customer profile', () => {
  it('requires auth', async () => { expect((await request(app).get('/api/customer/profile')).status).toBe(401); });
  it('rejects admin', async () => { expect((await request(app).get('/api/customer/profile').set('Authorization', `Bearer ${adminToken}`)).status).toBe(403); });
  it('gets profile', async () => { expect((await request(app).get('/api/customer/profile').set('Authorization', `Bearer ${customerToken}`)).status).toBe(200); });
  it('patches profile', async () => { expect((await request(app).patch('/api/customer/profile').set('Authorization', `Bearer ${customerToken}`).send({ name: 'Baru' })).status).toBe(200); });
  it('rejects role change', async () => { expect((await request(app).patch('/api/customer/profile').set('Authorization', `Bearer ${customerToken}`).send({ role: 'admin' })).status).toBe(400); });
  it('changes password with current password', async () => {
    userModel.findUserById.mockResolvedValue({ id: 10, name: 'C', email: 'c@e.com', phone: '0812', role: 'customer', passwordHash: '$2b$12$LQv3c1yqBWbYwQy3w5QvQOe7j6j7g3h6W8VQW8VQW8VQW8VQW8VQW', isActive: true });
    const response = await request(app).patch('/api/customer/profile/password').set('Authorization', `Bearer ${customerToken}`).send({ currentPassword: 'wrong', newPassword: 'new-password' });
    expect(response.status).toBe(401);
    expect(userModel.updateUserPassword).not.toHaveBeenCalled();
  });
  it('rejects short new password', async () => {
    const response = await request(app).patch('/api/customer/profile/password').set('Authorization', `Bearer ${customerToken}`).send({ currentPassword: 'current', newPassword: '1234567' });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Password baru minimal 8 karakter');
  });
  it('rejects oversized new password', async () => {
    const response = await request(app).patch('/api/customer/profile/password').set('Authorization', `Bearer ${customerToken}`).send({ currentPassword: 'current', newPassword: 'x'.repeat(73) });
    expect(response.status).toBe(400);
  });
});

describe('customer addresses', () => {
  it('requires auth', async () => { expect((await request(app).get('/api/customer/addresses')).status).toBe(401); });
  it('lists addresses', async () => { expect((await request(app).get('/api/customer/addresses').set('Authorization', `Bearer ${customerToken}`)).status).toBe(200); });
  it('creates address', async () => { expect((await request(app).post('/api/customer/addresses').set('Authorization', `Bearer ${customerToken}`).send({ label: 'Rumah', recipient_name: 'A', recipient_phone: '08123456789', street_address: 'Jl Test' })).status).toBe(201); });
  it('rejects invalid label', async () => { expect((await request(app).post('/api/customer/addresses').set('Authorization', `Bearer ${customerToken}`).send({ recipient_name: 'A', recipient_phone: '08123456789', street_address: 'Jl' })).status).toBe(400); });
  it('validates recipient and address fields', async () => {
    const response = await request(app).post('/api/customer/addresses').set('Authorization', `Bearer ${customerToken}`).send({ label: 'Rumah', recipient_name: 'A', recipient_phone: '123', street_address: 'Jl', postal_code: '1234', latitude: 91 });
    expect(response.status).toBe(400);
    expect(addressModel.insertAddress).not.toHaveBeenCalled();
  });
  it('enforces ownership on get', async () => {
    await request(app).get('/api/customer/addresses/999').set('Authorization', `Bearer ${customerToken}`);
    expect(addressModel.findAddressById).toHaveBeenCalledWith(999, 10);
  });
  it('patches address', async () => { addressModel.findAddressById.mockResolvedValue({ id: 1, userId: 10 }); expect((await request(app).patch('/api/customer/addresses/1').set('Authorization', `Bearer ${customerToken}`).send({ label: 'Kantor' })).status).toBe(200); });
  it('deletes address', async () => { expect((await request(app).delete('/api/customer/addresses/1').set('Authorization', `Bearer ${customerToken}`)).status).toBe(200); });
});
