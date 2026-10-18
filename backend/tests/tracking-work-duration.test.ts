import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();
const token = jwt.sign(
  { id: 1, email: 'admin@cleango.id', role: 'admin' },
  process.env.JWT_SECRET ?? 'cleango-development-only',
);
const input = {
  serviceType: 'Deep Cleaning',
  district: 'Lowokwaru',
  sizeUnit: 'm2',
  areaM2: 60,
  itemCount: 0,
  cleanerCount: 1,
  conditionLevel: 2,
  addOnCount: 1,
  startedAt: '2026-10-18T09:00:00+07:00',
  sopBaseMinutes: 150,
  scheduledDurationMinutes: 180,
};

afterEach(() => vi.unstubAllGlobals());

describe('work-duration prediction', () => {
  it('requires authentication on the application endpoint', async () => {
    const response = await request(app)
      .post('/api/tracking/work-duration')
      .send(input);
    expect(response.status).toBe(401);
  });

  it('returns the AI work-duration prediction', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              estimated_duration_minutes: 163.7,
              estimated_completed_at: '2026-10-18T11:43:42+07:00',
              source: 'ml_demo',
              model_name: 'linear_regression',
              model_version: 'work-duration-v1-synthetic',
              production_ready: false,
              warning: 'demo',
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const response = await request(app)
      .post('/api/tracking/work-duration')
      .set('Authorization', `Bearer ${token}`)
      .send(input);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      estimatedDurationMinutes: 163.7,
      estimatedCompletedAt: '2026-10-18T11:43:42+07:00',
      source: 'ml_demo',
      modelVersion: 'work-duration-v1-synthetic',
      productionReady: false,
    });
  });

  it('falls back to the scheduled service duration when AI is offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const response = await request(app)
      .post('/api/tracking/work-duration-preview')
      .send(input);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      estimatedDurationMinutes: 180,
      estimatedCompletedAt: '2026-10-18T05:00:00.000Z',
      source: 'backend_sop_fallback',
      modelVersion: null,
      productionReady: false,
    });
  });

  it('rejects invalid work inputs before calling AI', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await request(app)
      .post('/api/tracking/work-duration-preview')
      .send({ ...input, cleanerCount: 0 });

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
