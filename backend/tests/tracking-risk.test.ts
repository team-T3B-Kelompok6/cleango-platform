import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
const app = createApp();
const predictionAt = '2026-10-25T02:00:00.000Z';
const input = {
  cleanerLatitude: -7.97,
  cleanerLongitude: 112.61,
  destinationLatitude: -7.94,
  destinationLongitude: 112.62,
  predictionAt,
  scheduledAt: '2026-10-25T09:20:00+07:00',
  hasDeparted: true,
  locationAgeSeconds: 15,
};
const route = {
  code: 'Ok',
  routes: [
    {
      distance: 4200,
      duration: 900,
      geometry: {
        coordinates: [
          [112.61, -7.97],
          [112.62, -7.94],
        ],
      },
    },
  ],
};
afterEach(() => vi.unstubAllGlobals());
describe('schedule risk rules without classification', () => {
  it('requires authentication outside preview', async () => {
    expect(
      (await request(app).post('/api/tracking/risk').send(input)).status,
    ).toBe(401);
  });
  it.each([
    [1200, true, 15, 'low', false],
    [900, true, 15, 'low', false],
    [600, true, 15, 'medium', true],
    [300, true, 15, 'medium', true],
    [299, true, 15, 'high', true],
    [0, true, 15, 'high', true],
    [-1, true, 15, 'high', true],
    [1200, false, 15, 'medium', false],
    [3600, false, 15, 'low', false],
    [1200, true, 300, 'medium', null],
    [1200, true, 299, 'low', false],
    [1200, true, 599, 'medium', null],
    [1200, true, 600, 'high', null],
  ])(
    'schedule budget %s, departure %s, GPS age %s',
    async (seconds, departed, age, level, late) => {
      const fetchMock = vi.fn().mockResolvedValue(Response.json(route));
      vi.stubGlobal('fetch', fetchMock);
      const result = await request(app)
        .post('/api/tracking/risk-preview')
        .send({
          ...input,
          scheduledAt: new Date(
            Date.parse(predictionAt) + Number(seconds) * 1000,
          ).toISOString(),
          hasDeparted: departed,
          locationAgeSeconds: age,
        });
      expect(result.status).toBe(200);
      expect(result.body.data).toMatchObject({
        lateProbability: null,
        latePrediction: late,
        riskLevel: level,
        source: 'schedule_rule',
        etaSource: 'osrm',
        modelVersion: null,
      });
      expect(result.body.data.recommendation).toBeTruthy();
      expect(result.body.data.predictedLatenessSeconds).toBeGreaterThanOrEqual(
        0,
      );
      expect(fetchMock).toHaveBeenCalledOnce();
    },
  );
  it.each([
    { scheduledAt: undefined },
    { scheduledAt: '2026-10-25T09:00:00' },
    { hasDeparted: 'true' },
    { locationAgeSeconds: -1 },
    { locationAgeSeconds: null },
    { predictionAt: 'invalid' },
  ])('rejects invalid risk input %j before routing', async (changes) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(
      (
        await request(app)
          .post('/api/tracking/risk-preview')
          .send({ ...input, ...changes })
      ).status,
    ).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
