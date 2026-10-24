import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const categoryModel = vi.hoisted(() => ({
  findCategories: vi.fn(),
  findCategoryById: vi.fn(),
  insertCategory: vi.fn(),
  updateCategoryById: vi.fn(),
  deleteCategoryById: vi.fn(),
  deleteResourceCategoryById: vi.fn(),
  listFaqCategoryNames: vi.fn(),
  countFaqsUsingCategory: vi.fn(),
  renameFaqCategory: vi.fn(),
}));
const faqModel = vi.hoisted(() => ({
  listFaqs: vi.fn(),
  findFaq: vi.fn(),
  insertFaq: vi.fn(),
  updateFaqById: vi.fn(),
  deleteFaqById: vi.fn(),
}));
vi.mock('../src/model/category.model.js', () => categoryModel);
vi.mock('../src/model/faq.model.js', () => faqModel);
vi.mock('../src/model/user.model.js', () => ({
  isTokenRevoked: vi.fn().mockResolvedValue(false),
}));

import { createApp } from '../src/app.js';
import { createAccessToken } from '../src/lib/jwt.js';

const app = createApp();
const adminToken = createAccessToken({ id: 1, email: 'a@e.com', role: 'admin' } as never);
const auth = (method: 'get' | 'post' | 'patch' | 'delete', path: string) =>
  request(app)[method](path).set('Authorization', `Bearer ${adminToken}`);

beforeEach(() => {
  Object.values(categoryModel).forEach((m) => (m as ReturnType<typeof vi.fn>).mockReset());
  Object.values(faqModel).forEach((m) => (m as ReturnType<typeof vi.fn>).mockReset());
  categoryModel.findCategories.mockResolvedValue([]);
  categoryModel.listFaqCategoryNames.mockResolvedValue(['Jadwal', 'Layanan', 'Pembayaran']);
  categoryModel.countFaqsUsingCategory.mockResolvedValue(0);
  categoryModel.updateCategoryById.mockResolvedValue({ id: '9', name: 'Teknis Lanjutan', resource: 'faqs' });
  categoryModel.deleteCategoryById.mockResolvedValue(true);
  faqModel.insertFaq.mockResolvedValue({ id: '1', category: 'Jadwal', question: 'Q', answer: 'A', published: true });
});

describe('categories are separated per resource', () => {
  it('lists FAQ categories only', async () => {
    await auth('get', '/api/categories?resource=faqs');
    expect(categoryModel.findCategories).toHaveBeenCalledWith(false, 'faqs');
  });

  it('lists service categories only', async () => {
    await auth('get', '/api/categories?resource=services');
    expect(categoryModel.findCategories).toHaveBeenCalledWith(false, 'services');
  });

  it('stores a new category with its resource', async () => {
    categoryModel.insertCategory.mockResolvedValue({ id: '9', name: 'Teknis', resource: 'faqs' });
    const response = await auth('post', '/api/categories').send({ name: 'Teknis', resource: 'faqs' });
    expect(response.status).toBe(201);
    expect(categoryModel.insertCategory).toHaveBeenCalledWith(expect.anything(), 'faqs');
  });
});

describe('FAQ category validation', () => {
  it('accepts a category that exists for FAQs', async () => {
    const response = await auth('post', '/api/faqs').send({
      category: 'Jadwal',
      question: 'Q',
      answer: 'A',
      published: true,
    });
    expect(response.status).toBe(201);
  });

  it('rejects a category that is not a FAQ category', async () => {
    const response = await auth('post', '/api/faqs').send({
      category: 'Rumah',
      question: 'Q',
      answer: 'A',
      published: true,
    });
    expect(response.status).toBe(400);
    expect(response.body.errors.category).toContain('Jadwal');
    expect(faqModel.insertFaq).not.toHaveBeenCalled();
  });
});

describe('FAQ category rename and delete', () => {
  it('keeps FAQs in sync when the category is renamed', async () => {
    categoryModel.findCategoryById.mockResolvedValue({ id: '9', name: 'Teknis', resource: 'faqs' });
    const response = await auth('patch', '/api/categories/9').send({
      name: 'Teknis Lanjutan',
      resource: 'faqs',
    });
    expect(response.status).toBe(200);
    expect(categoryModel.renameFaqCategory).toHaveBeenCalledWith('Teknis', 'Teknis Lanjutan');
  });

  it('refuses to delete a FAQ category that is still used', async () => {
    categoryModel.findCategoryById.mockResolvedValue({ id: '9', name: 'Teknis', resource: 'faqs' });
    categoryModel.countFaqsUsingCategory.mockResolvedValue(2);
    const response = await auth('delete', '/api/categories/9');
    expect(response.status).toBe(409);
    expect(response.body.message).toContain('2 FAQ');
    expect(categoryModel.deleteCategoryById).not.toHaveBeenCalled();
  });

  it('deletes an unused FAQ category even without the resource parameter', async () => {
    categoryModel.findCategoryById.mockResolvedValue({ id: '9', name: 'Teknis', resource: 'faqs' });
    const response = await auth('delete', '/api/categories/9');
    expect(response.status).toBe(200);
    expect(categoryModel.deleteCategoryById).toHaveBeenCalledWith(9);
  });

  it('does not rename FAQs for a service category', async () => {
    categoryModel.findCategoryById.mockResolvedValue({ id: '5', name: 'Gudang', resource: 'services' });
    await auth('patch', '/api/categories/5').send({ name: 'Gudang Baru', resource: 'services' });
    expect(categoryModel.renameFaqCategory).not.toHaveBeenCalled();
  });
});
