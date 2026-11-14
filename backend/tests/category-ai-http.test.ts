import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
const category = vi.hoisted(() => ({
  findCategories: vi.fn(),
  findCategoryById: vi.fn(),
  insertCategory: vi.fn(),
  updateCategoryById: vi.fn(),
}));
vi.mock('../src/model/category.model.js', async (original) => ({
  ...(await original<typeof import('../src/model/category.model.js')>()),
  ...category,
}));
vi.mock('../src/model/user.model.js', async (original) => ({
  ...(await original<typeof import('../src/model/user.model.js')>()),
  isTokenRevoked: vi.fn().mockResolvedValue(false),
}));
import { createApp } from '../src/app.js';
import { createAccessToken } from '../src/lib/jwt.js';
const app = createApp();
const token = createAccessToken({
  id: 1,
  role: 'admin',
  email: 'synthetic@example.test',
} as never);
const call = (method: 'post' | 'patch' | 'get', path: string, body?: unknown) =>
  request(app)
    [method](path)
    .set('Authorization', `Bearer ${token}`)
    .send(body as object);
const row = {
  id: 1,
  name: 'Motor',
  resource: 'services',
};
category.findCategoryById.mockResolvedValue(row);
category.findCategories.mockResolvedValue([row]);
category.insertCategory.mockImplementation(async (input) => ({
  ...row,
  ...input,
}));
category.updateCategoryById.mockImplementation(async (_id, input) => ({
  ...row,
  ...input,
}));
describe('category HTTP contract without photo target mapping', () => {
  it('does not return or require aiTargets on native or resource-compatible routes', async () => {
    const created = await call('post', '/api/admin/categories', {
      name: 'Motor',
      aiTargets: ['motorcycle'],
    });
    expect(created.status).toBe(201);
    expect(created.body.data.aiTargets).toBeUndefined();

    const patched = await call('patch', '/api/admin/categories/1', {
      name: 'Motor Baru',
      aiTargets: ['ignored'],
    });
    expect(patched.status).toBe(200);
    expect(patched.body.data.aiTargets).toBeUndefined();

    const list = await call('get', '/api/admin/categories');
    expect(list.body.data[0].aiTargets).toBeUndefined();

    const detail = await call('get', '/api/admin/categories/1');
    expect(detail.body.data.aiTargets).toBeUndefined();

    const resCreated = await call('post', '/api/categories', {
      name: 'Motor',
      aiTargets: ['invalid'],
    });
    expect(resCreated.status).toBe(201);
    expect(resCreated.body.data.aiTargets).toBeUndefined();
  });
});
