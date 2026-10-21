import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const categoryModel = vi.hoisted(() => ({
  findCategories: vi.fn(),
  findCategoryById: vi.fn(),
  listFaqCategoryNames: vi.fn(),
  countFaqsUsingCategory: vi.fn(),
  renameFaqCategory: vi.fn(),
  insertCategory: vi.fn(),
  updateCategoryById: vi.fn(),
  deleteCategoryById: vi.fn(),
  deleteResourceCategoryById: vi.fn(),
}));
vi.mock('../src/model/category.model.js', () => categoryModel);

import { createApp } from '../src/app.js';
import { createAccessToken } from '../src/lib/jwt.js';

const app = createApp();
const adminToken = createAccessToken({ id: 1, email: 'a@e.com', role: 'admin' } as never);
const del = (path: string) =>
  request(app).delete(path).set('Authorization', `Bearer ${adminToken}`);

beforeEach(() => {
  categoryModel.deleteResourceCategoryById.mockReset();
  categoryModel.findCategoryById.mockReset();
  categoryModel.findCategoryById.mockResolvedValue({
    id: '5',
    name: 'Kategori',
    resource: 'services',
  });
});

describe('DELETE /api/categories/:id', () => {
  it('deletes an unused category', async () => {
    categoryModel.deleteResourceCategoryById.mockResolvedValue('deleted');
    const response = await del('/api/categories/5');
    expect(response.status).toBe(200);
    expect(categoryModel.deleteResourceCategoryById).toHaveBeenCalledWith(5, {
      deleteServices: false,
    });
  });

  it('passes deleteServices=true through to the model', async () => {
    categoryModel.deleteResourceCategoryById.mockResolvedValue('deleted');
    const response = await del('/api/categories/5?deleteServices=true');
    expect(response.status).toBe(200);
    expect(categoryModel.deleteResourceCategoryById).toHaveBeenCalledWith(5, {
      deleteServices: true,
    });
  });

  it('409s with a clear message when services still use the category', async () => {
    categoryModel.deleteResourceCategoryById.mockResolvedValue('in_use_by_services');
    const response = await del('/api/categories/5');
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('CATEGORY_IN_USE');
    expect(response.body.message).toContain('masih digunakan oleh layanan');
  });

  it('409s when the services are already used by bookings', async () => {
    categoryModel.deleteResourceCategoryById.mockResolvedValue('in_use_by_orders');
    const response = await del('/api/categories/5?deleteServices=true');
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('CATEGORY_IN_USE');
    expect(response.body.message).toContain('sudah dipakai pada pesanan');
  });

  it('404s for a missing category', async () => {
    categoryModel.deleteResourceCategoryById.mockResolvedValue('not_found');
    const response = await del('/api/categories/999');
    expect(response.status).toBe(404);
  });
});
