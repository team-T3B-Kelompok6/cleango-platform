import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/model/user.model.js', async (original) => ({
  ...(await original<typeof import('../src/model/user.model.js')>()),
  isTokenRevoked: vi.fn().mockResolvedValue(false),
}));

const faqModel = vi.hoisted(() => ({
  listPublishedFaqs: vi.fn(),
}));
vi.mock('../src/model/faq.model.js', () => faqModel);

import { createApp } from '../src/app.js';
import { createAccessToken } from '../src/lib/jwt.js';

const app = createApp();
const customerToken = createAccessToken({ id: 10, email: 'c@e.com', role: 'customer' } as never);

beforeEach(() => {
  faqModel.listPublishedFaqs.mockReset();
  faqModel.listPublishedFaqs.mockResolvedValue([
    { id: '1', category: 'Pembayaran', question: 'Q1', answer: 'A1', published: true, updatedAt: '2026-01-01T00:00:00.000Z' },
  ]);
});

describe('customer faqs', () => {
  it('requires auth', async () => {
    expect((await request(app).get('/api/customer/faqs')).status).toBe(401);
  });
  it('rejects admin', async () => {
    const adminToken = createAccessToken({ id: 1, email: 'a@e.com', role: 'admin' } as never);
    expect((await request(app).get('/api/customer/faqs').set('Authorization', `Bearer ${adminToken}`)).status).toBe(403);
  });
  it('lists published faqs for customer', async () => {
    const response = await request(app).get('/api/customer/faqs').set('Authorization', `Bearer ${customerToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });
  it('only serves published list function', async () => {
    await request(app).get('/api/customer/faqs').set('Authorization', `Bearer ${customerToken}`);
    expect(faqModel.listPublishedFaqs).toHaveBeenCalled();
  });
});
