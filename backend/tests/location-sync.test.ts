import request from 'supertest';
import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ pool: { query: vi.fn(), execute: vi.fn() } }));
vi.mock('../src/lib/db.js', () => db);
vi.mock('../src/model/user.model.js', async (original) => ({
  ...(await original<typeof import('../src/model/user.model.js')>()),
  isTokenRevoked: vi.fn().mockResolvedValue(false),
}));

import { createApp } from '../src/app.js';
import { hashToken, type TaskRow } from '../src/model/cleaner-task.model.js';

const app = createApp();
const now = Date.parse('2026-11-13T02:00:00Z');
const taskToken = 'location-sync-task-token';
const customerToken = (id = 10, role = 'customer') =>
  jwt.sign(
    { id, email: 'tracking@example.test', role },
    process.env.JWT_SECRET ?? 'cleango-development-only',
  );
let row: TaskRow;
let keys: Set<string>;
let failSave: boolean;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  keys = new Set();
  failSave = false;
  row = {
    assignmentId: 7,
    bookingId: 9,
    customerId: 10,
    cleanerId: 3,
    linkStatus: 'active',
    linkExpiresAt: new Date(now + 86400000),
    linkTokenEnc: null,
    updatedAt: new Date(now),
    orderStatus: 'en_route',
    departedAt: new Date(now - 60000),
    arrivedAt: null,
    startedAt: null,
    completedAt: null,
    customerName: 'Customer',
    customerPhone: null,
    address: 'Test address',
    serviceName: 'Cleaning',
    serviceDurationMinutes: 60,
    staffName: 'Cleaner',
    orderDate: '2026-11-13',
    orderTime: '09:00',
    notes: null,
    locationSharingStartedAt: null,
    latitude: null,
    longitude: null,
    locationUpdatedAt: null,
    destinationLatitude: -7.94,
    destinationLongitude: 112.62,
    summary: null,
    reportChecked: null,
  };
  db.pool.query
    .mockReset()
    .mockImplementation(async (sql: string, values: unknown[]) => {
      if (sql.includes('FROM cleaner_task_photos')) return [[], []];
      expect(sql).toContain(
        'LEFT JOIN cleaner_task_stages bs ON bs.assignment_id = ca.id',
      );
      if (sql.includes('WHERE ca.link_token_hash = ?')) {
        return [values[0] === hashToken(taskToken) ? [{ ...row }] : [], []];
      }
      expect(sql).toContain('WHERE b.customer_id = ? AND b.id = ?');
      return [
        values[0] === row.customerId && values[1] === row.bookingId
          ? [{ ...row }]
          : [],
        [],
      ];
    });
  db.pool.execute
    .mockReset()
    .mockImplementation(async (sql: string, values: unknown[]) => {
      expect(values[0]).toBe(row.assignmentId);
      if (sql.includes('INSERT IGNORE INTO cleaner_event_keys')) {
        const key = String(values[1]);
        const affectedRows = keys.has(key) ? 0 : 1;
        keys.add(key);
        return [{ affectedRows }, []];
      }
      if (sql.includes('UPDATE cleaner_assignments')) {
        row.locationSharingStartedAt ??= new Date(Date.now());
      } else {
        expect(sql).toContain('INSERT INTO cleaner_task_stages');
        expect(sql).toContain('ON DUPLICATE KEY UPDATE');
        expect(sql).toContain(
          'location_updated_at = VALUES(location_updated_at)',
        );
        if (failSave) throw new Error('DB unavailable');
        row.latitude = Number(values[1]);
        row.longitude = Number(values[2]);
        row.locationUpdatedAt = new Date(values[3] as Date).getTime();
      }
      return [{ affectedRows: 1 }, []];
    });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async () =>
      Response.json({
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
      }),
    ),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const share = (
  key = 'gps-sync-key-1',
  latitude: unknown = -7.97,
  capturedAt = Date.now(),
) =>
  request(app)
    .post('/api/cleaner-task/events')
    .set('Authorization', `Bearer ${taskToken}`)
    .set('Idempotency-Key', key)
    .send({ kind: 'location', latitude, longitude: 112.61, capturedAt });
const track = (token = customerToken()) =>
  request(app)
    .get('/api/customer/bookings/9/tracking')
    .set('Authorization', `Bearer ${token}`);

describe('durable assignment location sync through existing routes', () => {
  it('writes GPS then reads same coordinates and timestamp through owned booking', async () => {
    const saved = await share();
    expect(saved.status).toBe(200);
    expect(saved.body.data.location).toEqual({
      latitude: -7.97,
      longitude: 112.61,
      updatedAt: new Date(now).toISOString(),
    });
    const response = await track();
    expect(response.status).toBe(200);
    expect(response.body.data.cleaner).toEqual({
      latitude: -7.97,
      longitude: 112.61,
    });
    expect(response.body.data.locationUpdatedAt).toBe(
      saved.body.data.location.updatedAt,
    );

    vi.setSystemTime(now + 30000);
    expect((await share('gps-sync-key-2', -7.96)).status).toBe(200);
    const updated = await track();
    expect(updated.body.data.cleaner.latitude).toBe(-7.96);
    expect(updated.body.data.locationUpdatedAt).toBe(
      new Date(now + 30000).toISOString(),
    );
  });

  it('preserves acquisition time despite network delay', async () => {
    const capturedAt = now - 25000;
    const saved = await request(app)
      .post('/api/cleaner-task/events')
      .set('Authorization', `Bearer ${taskToken}`)
      .set('Idempotency-Key', 'gps-delayed-key')
      .send({
        kind: 'location',
        latitude: -7.97,
        longitude: 112.61,
        capturedAt,
      });
    expect(saved.status).toBe(200);
    expect(saved.body.data.location.updatedAt).toBe(
      new Date(capturedAt).toISOString(),
    );
    const response = await track();
    expect(response.body.data.locationUpdatedAt).toBe(
      new Date(capturedAt).toISOString(),
    );
  });

  it.each([undefined, null, 'now', now + 1000, now - 30001])(
    'rejects invalid or expired acquisition timestamp %s before writing GPS',
    async (capturedAt) => {
      const saved = await request(app)
        .post('/api/cleaner-task/events')
        .set('Authorization', `Bearer ${taskToken}`)
        .set('Idempotency-Key', 'gps-invalid-time')
        .send({
          kind: 'location',
          latitude: -7.97,
          longitude: 112.61,
          capturedAt,
        });
      expect(saved.status).toBe(400);
      expect(row.locationUpdatedAt).toBeNull();
    },
  );

  it('rejects GPS writes once arrival or cancellation ended travel', async () => {
    for (const status of ['in_progress', 'completed', 'cancelled']) {
      row.orderStatus = status;
      db.pool.execute.mockClear();
      expect((await share(`gps-${status}-key`)).status).toBe(409);
      expect(db.pool.execute).toHaveBeenCalledOnce();
      expect(db.pool.execute.mock.calls[0][0]).toContain(
        'INSERT IGNORE INTO cleaner_event_keys',
      );
    }
  });

  it('does not expose coordinates to anonymous, non-customer, or another customer', async () => {
    await share();
    db.pool.query.mockClear();
    expect(
      (await request(app).get('/api/customer/bookings/9/tracking')).status,
    ).toBe(401);
    expect((await track(customerToken(1, 'admin'))).status).toBe(403);
    expect(db.pool.query).not.toHaveBeenCalled();
    const other = await track(customerToken(11));
    expect(other.status).toBe(404);
    expect(other.body.data).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['revoked', 'expired'] as const)(
    'rejects %s task token before GPS writes',
    async (status) => {
      row.linkStatus = status;
      expect((await share()).status).toBe(410);
      expect(db.pool.execute).not.toHaveBeenCalled();
    },
  );

  it('does not turn replayed GPS into a fresh fix', async () => {
    await share();
    vi.setSystemTime(now + 300000);
    db.pool.execute.mockClear();
    const replay = await share();
    expect(replay.status).toBe(200);
    expect(replay.body.data.location.updatedAt).toBe(
      new Date(now).toISOString(),
    );
    expect(db.pool.execute).toHaveBeenCalledOnce();
    expect(row.locationUpdatedAt).toBe(now);
    const stale = await track();
    expect(stale.status).toBe(200);
    expect(stale.body.data).toMatchObject({
      routeStatus: 'stale',
      etaSeconds: null,
      cleaner: { latitude: -7.97 },
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects invalid GPS without changing stored coordinates', async () => {
    await share();
    expect((await share('gps-invalid-key', 91)).status).toBe(400);
    expect(row.latitude).toBe(-7.97);
    expect(row.locationUpdatedAt).toBe(now);
  });

  it.each(['stale', 'future', 'cancelled', 'completed', 'revoked'])(
    'withholds %s tracking without refreshing saved GPS timestamp',
    async (state) => {
      await share();
      if (state === 'stale') vi.setSystemTime(now + 300000);
      if (state === 'future') vi.setSystemTime(now - 1000);
      if (state === 'cancelled' || state === 'completed')
        row.orderStatus = state;
      if (state === 'revoked') row.linkStatus = state;
      const response = await track();
      if (state === 'stale' || state === 'future') {
        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({
          routeStatus: 'stale',
          etaSeconds: null,
          locationUpdatedAt: new Date(now).toISOString(),
        });
      } else {
        expect(response.status).toBe(409);
        expect(response.body.data).toBeUndefined();
      }
      expect(row.locationUpdatedAt).toBe(now);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it('reports failed GPS persistence without fabricating customer location', async () => {
    failSave = true;
    expect((await share()).status).toBe(500);
    expect(row.locationUpdatedAt).toBeNull();
    expect((await track()).status).toBe(409);
    expect(fetch).not.toHaveBeenCalled();
  });
});
