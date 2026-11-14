import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/lib/db.js', () => ({ pool: { execute: vi.fn(), query: vi.fn(), getConnection: vi.fn() } }));
import { pool } from '../src/lib/db.js';
import { createApp } from '../src/app.js';

const app = createApp();
afterEach(() => vi.unstubAllGlobals());

describe('payment app mount', () => {
  it('removed legacy webhook returns 404 without network or database access', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await request(app).post('/api/payments/webhook').send({ event: 'payment_session.completed' });
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(pool.execute).not.toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
    expect(pool.getConnection).not.toHaveBeenCalled();
  });
});
