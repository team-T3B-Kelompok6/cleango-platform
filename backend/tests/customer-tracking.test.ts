import request from 'supertest';
import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const find = vi.hoisted(() => vi.fn());
vi.mock('../src/model/user.model.js', async (original) => ({
  ...(await original<typeof import('../src/model/user.model.js')>()),
  isTokenRevoked: vi.fn().mockResolvedValue(false),
}));
vi.mock('../src/model/cleaner-task.model.js', async (original) => ({
  ...(await original<typeof import('../src/model/cleaner-task.model.js')>()),
  findCustomerTask: find,
}));
import { createApp } from '../src/app.js';
const app = createApp();
const token = jwt.sign(
  { id: 10, email: 'test@example.test', role: 'customer' },
  process.env.JWT_SECRET ?? 'cleango-development-only',
);
const now = Date.parse('2026-10-25T02:00:00Z');
const row = {
  bookingId: 9,
  departedAt: new Date(now - 60000),
  startedAt: null,
  completedAt: null,
  orderStatus: 'en_route',
  linkStatus: 'active',
  linkExpiresAt: new Date('2030-01-01T00:00:00Z'),
  latitude: -7.97,
  longitude: 112.61,
  destinationLatitude: -7.94,
  destinationLongitude: 112.62,
  locationUpdatedAt: now - 10000,
};
const route = {
  code: 'Ok',
  routes: [
    {
      distance: 1200,
      duration: 121,
      geometry: {
        coordinates: [
          [112.61, -7.97],
          [112.62, -7.94],
        ],
      },
    },
  ],
};
beforeEach(() => {
  find.mockReset().mockResolvedValue(row);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(route)));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const get = () =>
  request(app)
    .get('/api/customer/bookings/9/tracking')
    .set('Authorization', `Bearer ${token}`);
describe('owned booking ETA', () => {
  it('rejects anonymous access before reading coordinates', async () => {
    expect(
      (await request(app).get('/api/customer/bookings/9/tracking')).status,
    ).toBe(401);
    expect(find).not.toHaveBeenCalled();
  });
  it('uses the session owner and saved coordinates, not query overrides', async () => {
    const response = await request(app)
      .get('/api/customer/bookings/9/tracking?cleanerLatitude=0&customerId=999')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(find).toHaveBeenCalledWith(10, 9);
    expect(response.body.data).toMatchObject({
      orderId: '9',
      etaSeconds: 121,
      etaMinutes: 3,
      source: 'osrm',
      modelVersion: null,
      cleaner: { latitude: -7.97, longitude: 112.61 },
      locationUpdatedAt: '2026-10-25T01:59:50.000Z',
      estimatedArrivalAt: '2026-10-25T02:02:01.000Z',
    });
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('does not expose another customer assignment', async () => {
    find.mockResolvedValue(null);
    const response = await get();
    expect(response.status).toBe(404);
    expect(response.body.data).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    { departedAt: null, orderStatus: 'assigned' },
    { startedAt: now - 1000, orderStatus: 'in_progress' },
    { completedAt: new Date(now), orderStatus: 'completed' },
    { orderStatus: 'cancelled' },
    { linkStatus: 'revoked' },
    { linkExpiresAt: new Date(now) },
    { locationUpdatedAt: null },
    { locationUpdatedAt: now - 300000 },
    { locationUpdatedAt: now + 1000 },
  ])('does not invent a route for unavailable travel %j', async (changes) => {
    find.mockResolvedValue({ ...row, ...changes });
    expect((await get()).status).toBe(409);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('allows GPS younger than the stale boundary', async () => {
    find.mockResolvedValue({ ...row, locationUpdatedAt: now - 299999 });
    expect((await get()).status).toBe(200);
  });
  it('does not send invalid stored coordinates to the routing provider', async () => {
    find.mockResolvedValue({ ...row, latitude: null });
    expect((await get()).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('returns a routing failure without a fabricated estimate', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const response = await get();
    expect(response.status).toBe(502);
    expect(response.body.data).toBeUndefined();
  });
});
