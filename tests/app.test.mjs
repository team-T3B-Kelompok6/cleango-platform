import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../dist/app.js';

const app = createApp();

describe('CleanGo API', () => {
  it('returns its health status', async () => {
    const response = await request(app).get('/health');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      success: true,
      message: 'CleanGo API is healthy',
      data: { status: 'ok' },
    });
  });

  it('returns a consistent not-found envelope', async () => {
    const response = await request(app).get('/missing');
    assert.equal(response.status, 404);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, 'ROUTE_NOT_FOUND');
  });

  it('rejects role injection during registration', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      email: 'customer@example.com',
      password: 'password123',
      fullName: 'Customer',
      role: 'admin',
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  });

  it('protects customer booking routes', async () => {
    const response = await request(app).get('/api/v1/bookings');
    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, 'AUTH_REQUIRED');
  });

  it('validates catalog query before database access', async () => {
    const response = await request(app).get('/api/v1/services?page=0');
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  });
});
