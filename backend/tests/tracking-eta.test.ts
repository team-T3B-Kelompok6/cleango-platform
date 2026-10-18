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
  cleanerLatitude: -7.97342,
  cleanerLongitude: 112.61521,
  destinationLatitude: -7.9398,
  destinationLongitude: 112.6265,
  initialDistanceM: 6500,
  elapsedSeconds: 420,
  stoppedDurationSeconds: 30,
  rollingSpeedMps: 5.8,
};
const routeResponse = {
  code: 'Ok',
  routes: [
    {
      distance: 4200,
      duration: 900,
      geometry: {
        coordinates: [
          [112.61521, -7.97342],
          [112.6265, -7.9398],
        ],
      },
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe('tracking ETA', () => {
  it('requires authentication on the application endpoint', async () => {
    const response = await request(app).post('/api/tracking/eta').send(input);
    expect(response.status).toBe(401);
  });

  it('uses the ML ETA when the evaluated model beats the baseline', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(routeResponse), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              eta_seconds: 720,
              eta_minutes: 12,
              model_name: 'random_forest',
              model_version: 'eta-v1',
              model_better_than_baseline: true,
              predicted_at: new Date().toISOString(),
              warning: 'demo',
            },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app)
      .post('/api/tracking/eta')
      .set('Authorization', `Bearer ${token}`)
      .send(input);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      etaSeconds: 720,
      baselineEtaSeconds: 900,
      distanceMeters: 4200,
      source: 'ml',
      modelVersion: 'eta-v1',
    });
  });

  it('falls back to OSRM when the AI service is unavailable', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(routeResponse), { status: 200 }),
      )
      .mockRejectedValueOnce(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app)
      .post('/api/tracking/eta-preview')
      .send(input);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      etaSeconds: 900,
      source: 'osrm_fallback',
      modelVersion: null,
    });
  });

  it('falls back to OSRM when the ML result is implausibly far from the route ETA', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(routeResponse), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              eta_seconds: 120,
              eta_minutes: 2,
              model_name: 'random_forest',
              model_version: 'eta-v1',
              model_better_than_baseline: true,
              predicted_at: new Date().toISOString(),
              warning: 'demo',
            },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app)
      .post('/api/tracking/eta-preview')
      .send(input);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      etaSeconds: 900,
      source: 'osrm_fallback',
      modelVersion: null,
    });
  });

  it('recalculates ETA after the cleaner coordinate changes', async () => {
    const prediction = (seconds: number) =>
      new Response(
        JSON.stringify({
          data: {
            eta_seconds: seconds,
            eta_minutes: Math.round(seconds / 60),
            model_name: 'linear_regression',
            model_version: 'eta-v1',
            model_better_than_baseline: true,
            predicted_at: new Date().toISOString(),
            warning: 'demo',
          },
        }),
        { status: 200 },
      );
    const closerRoute = {
      code: 'Ok',
      routes: [
        {
          distance: 1400,
          duration: 300,
          geometry: {
            coordinates: [
              [112.622, -7.948],
              [112.6265, -7.9398],
            ],
          },
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(routeResponse), { status: 200 }),
      )
      .mockResolvedValueOnce(prediction(720))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(closerRoute), { status: 200 }),
      )
      .mockResolvedValueOnce(prediction(240));
    vi.stubGlobal('fetch', fetchMock);

    const first = await request(app)
      .post('/api/tracking/eta-preview')
      .send(input);
    const second = await request(app)
      .post('/api/tracking/eta-preview')
      .send({ ...input, cleanerLatitude: -7.948, cleanerLongitude: 112.622 });

    expect(first.body.data.etaSeconds).toBe(720);
    expect(second.body.data.etaSeconds).toBe(240);
    expect(second.body.data.distanceMeters).toBeLessThan(
      first.body.data.distanceMeters,
    );
  });

  it('rejects invalid coordinates before calling OSRM', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await request(app)
      .post('/api/tracking/eta-preview')
      .send({ ...input, cleanerLatitude: 100 });
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
