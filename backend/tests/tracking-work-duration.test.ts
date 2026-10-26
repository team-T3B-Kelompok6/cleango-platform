import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/model/user.model.js', async (original) => ({
  ...(await original<typeof import('../src/model/user.model.js')>()),
  isTokenRevoked: vi.fn().mockResolvedValue(false),
}));
import { createApp } from '../src/app.js';
import { estimateWorkCompletion } from '../src/lib/work-estimate.js';
const app = createApp();
const token = jwt.sign(
  { id: 1, email: 'admin@cleango.id', role: 'admin' },
  process.env.JWT_SECRET ?? 'cleango-development-only',
);
const input = {
  startedAt: '2026-10-25T09:00:00+07:00',
  scheduledDurationMinutes: 180,
};
afterEach(() => vi.unstubAllGlobals());
describe('service duration arithmetic without regression', () => {
  it('requires authentication outside preview', async () => {
    expect(
      (await request(app).post('/api/tracking/work-duration').send(input))
        .status,
    ).toBe(401);
  });
  it('calculates start plus duration with no network or Python requests', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await request(app)
      .post('/api/tracking/work-duration')
      .set('Authorization', 'Bearer ' + token)
      .send(input);
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({
      estimatedDurationMinutes: 180,
      estimatedCompletedAt: '2026-10-25T05:00:00.000Z',
      source: 'service_duration',
      modelVersion: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('uses supplied SOP for a new service without retraining or invented dirt multipliers', async () => {
    const result = await request(app)
      .post('/api/tracking/work-duration-preview')
      .send({
        startedAt: input.startedAt,
        serviceType: 'Layanan baru',
        sopBaseMinutes: 90,
        conditionLevel: 3,
        cleanerCount: 2,
      });
    expect(result.body.data.estimatedDurationMinutes).toBe(90);
  });
  it.each([
    { scheduledDurationMinutes: 0 },
    { scheduledDurationMinutes: null },
    { scheduledDurationMinutes: true },
    { scheduledDurationMinutes: 10.5 },
    { scheduledDurationMinutes: 1441 },
    { startedAt: 'invalid' },
    { startedAt: '2026-10-25T09:00:00' },
    { cleanerCount: 0 },
    { cleanerCount: 1.5 },
  ])('rejects invalid work input %j', async (changes) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(
      (
        await request(app)
          .post('/api/tracking/work-duration-preview')
          .send({ ...input, ...changes })
      ).status,
    ).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('does not guess a duration when neither scheduled duration nor SOP is supplied', async () => {
    expect(
      (
        await request(app)
          .post('/api/tracking/work-duration-preview')
          .send({ startedAt: input.startedAt })
      ).status,
    ).toBe(400);
  });
  it('handles midnight rollover and does not make up a start time', () => {
    expect(
      estimateWorkCompletion(Date.parse('2026-10-25T09:00:00+07:00'), 120),
    ).toBe('2026-10-25T04:00:00.000Z');
    expect(estimateWorkCompletion('2026-10-25T23:30:00+07:00', 90)).toBe(
      '2026-10-25T18:00:00.000Z',
    );
    expect(estimateWorkCompletion(null, 120)).toBeNull();
    expect(estimateWorkCompletion('invalid', 120)).toBeNull();
    expect(estimateWorkCompletion(input.startedAt, null)).toBeNull();
    expect(estimateWorkCompletion(input.startedAt, NaN)).toBeNull();
  });
});
