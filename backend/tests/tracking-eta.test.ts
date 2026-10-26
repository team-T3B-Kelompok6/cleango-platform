import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/model/user.model.js', async (original) => ({
  ...(await original<typeof import('../src/model/user.model.js')>()),
  isTokenRevoked: vi.fn().mockResolvedValue(false),
}));
import { createApp } from '../src/app.js';
const app = createApp();
const token = jwt.sign(
  { id: 1, email: 'admin@cleango.id', role: 'admin' },
  process.env.JWT_SECRET ?? 'cleango-development-only',
);
const input = {
  cleanerLatitude: -7.97,
  cleanerLongitude: 112.61,
  destinationLatitude: -7.94,
  destinationLongitude: 112.62,
};
const route = (distance = 4200, duration = 901) => ({
  code: 'Ok',
  routes: [
    {
      distance,
      duration,
      geometry: {
        coordinates: [
          [112.61, -7.97],
          [112.62, -7.94],
        ],
      },
    },
  ],
});
afterEach(() => vi.unstubAllGlobals());

describe('route ETA without ML', () => {
  it('requires authentication on the application endpoint', async () => {
    expect(
      (await request(app).post('/api/tracking/eta').send(input)).status,
    ).toBe(401);
  });
  it('returns the route duration, rounds minutes up and never calls Python', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(route()));
    vi.stubGlobal('fetch', fetchMock);
    const result = await request(app)
      .post('/api/tracking/eta')
      .set('Authorization', 'Bearer ' + token)
      .send(input);
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({
      etaSeconds: 901,
      etaMinutes: 16,
      distanceMeters: 4200,
      source: 'osrm',
      modelVersion: null,
      calculationVersion: 'route-v1',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]![0]).toContain('/route/v1/driving/');
  });
  it('recalculates after coordinates change', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(route()))
      .mockResolvedValueOnce(Response.json(route(1400, 300)));
    vi.stubGlobal('fetch', fetchMock);
    const first = await request(app)
      .post('/api/tracking/eta-preview')
      .send(input);
    const second = await request(app)
      .post('/api/tracking/eta-preview')
      .send({ ...input, cleanerLatitude: -7.95 });
    expect(second.body.data.etaSeconds).toBeLessThan(
      first.body.data.etaSeconds,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]![0]).toContain('112.61,-7.95');
  });
  it.each([100, null, true, '0', '', [], {}])(
    'rejects invalid coordinate %j before routing',
    async (value) => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const result = await request(app)
        .post('/api/tracking/eta-preview')
        .send({ ...input, cleanerLatitude: value });
      expect(result.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it.each([
    null,
    [],
    { code: 'NoRoute' },
    {
      code: 'Ok',
      routes: [{ distance: 1, duration: 5, geometry: { coordinates: [null] } }],
    },
  ])('rejects malformed route %j', async (payload) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(payload)));
    expect(
      (await request(app).post('/api/tracking/eta-preview').send(input)).status,
    ).toBe(502);
  });
  it('reports invalid upstream JSON as a routing error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not JSON')));
    expect(
      (await request(app).post('/api/tracking/eta-preview').send(input)).status,
    ).toBe(502);
  });
  it('reports routing failure without inventing a travel estimate', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const result = await request(app)
      .post('/api/tracking/eta-preview')
      .send(input);
    expect(result.status).toBe(502);
    expect(result.body.data).toBeUndefined();
  });
});
