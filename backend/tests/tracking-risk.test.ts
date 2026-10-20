import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();
const token = jwt.sign(
  { id: 1, email: 'admin@cleango.id', role: 'admin' },
  process.env.JWT_SECRET ?? 'cleango-development-only',
);
const predictionAt = '2026-10-17T09:00:00.000Z';
const input = {
  cleanerLatitude: -6.2095,
  cleanerLongitude: 106.7907,
  destinationLatitude: -6.2011,
  destinationLongitude: 106.8025,
  initialDistanceM: 6500,
  elapsedSeconds: 420,
  stoppedDurationSeconds: 30,
  rollingSpeedMps: 5.8,
  predictionAt,
  scheduledAt: '2026-10-17T09:20:00.000Z',
  locationAgeSeconds: 15,
  hasDeparted: true,
};
const routeResponse = {
  code: 'Ok',
  routes: [
    {
      distance: 4200,
      duration: 900,
      geometry: {
        coordinates: [
          [106.7907, -6.2095],
          [106.8025, -6.2011],
        ],
      },
    },
  ],
};
const etaResponse = () =>
  new Response(
    JSON.stringify({
      data: {
        eta_seconds: 1_020,
        eta_minutes: 17,
        model_name: 'linear_regression',
        model_version: 'eta-v1',
        model_better_than_baseline: true,
        predicted_at: predictionAt,
        warning: 'demo',
      },
    }),
    { status: 200 },
  );

afterEach(() => vi.unstubAllGlobals());

describe('tracking late risk', () => {
  it('requires authentication on the application endpoint', async () => {
    const response = await request(app).post('/api/tracking/risk').send(input);
    expect(response.status).toBe(401);
  });

  it('returns ML probability and an admin recommendation', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(routeResponse), { status: 200 }),
      )
      .mockResolvedValueOnce(etaResponse())
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              late_probability: 0.78,
              late_prediction: true,
              risk_level: 'high',
              predicted_lateness_seconds: 180,
              decision_threshold: 0.6,
              high_threshold: 0.65,
              model_name: 'random_forest',
              model_version: 'risk-v1',
              predicted_at: predictionAt,
              warning: 'demo',
            },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app)
      .post('/api/tracking/risk')
      .set('Authorization', `Bearer ${token}`)
      .send(input);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      lateProbability: 0.78,
      latePrediction: true,
      riskLevel: 'high',
      source: 'ml',
      modelVersion: 'risk-v1',
    });
    expect(response.body.data.recommendation).toContain('Hubungi cleaner');
  });

  it('uses an explainable no-departure rule near the schedule', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(routeResponse), { status: 200 }),
      )
      .mockResolvedValueOnce(etaResponse());
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app)
      .post('/api/tracking/risk-preview')
      .send({
        ...input,
        hasDeparted: false,
        scheduledAt: '2026-10-17T09:15:00.000Z',
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      lateProbability: null,
      latePrediction: true,
      riskLevel: 'high',
      source: 'rule_fallback',
      modelVersion: null,
    });
    expect(response.body.data.reason).toContain('belum berangkat');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to ETA rules when risk inference is unavailable', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(routeResponse), { status: 200 }),
      )
      .mockResolvedValueOnce(etaResponse())
      .mockRejectedValueOnce(new Error('risk model offline'));
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app)
      .post('/api/tracking/risk-preview')
      .send(input);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      riskLevel: 'low',
      source: 'rule_fallback',
      modelVersion: null,
    });
  });

  it('rejects missing schedule data', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { scheduledAt: _scheduledAt, ...incomplete } = input;
    const response = await request(app)
      .post('/api/tracking/risk-preview')
      .send(incomplete);
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
