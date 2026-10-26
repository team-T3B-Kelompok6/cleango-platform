import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../src/model/user.model.js', async (original) => ({
  ...(await original<typeof import('../src/model/user.model.js')>()),
  isTokenRevoked: vi.fn().mockResolvedValue(false),
}));

const taskModel = vi.hoisted(() => ({
  assertUsable: vi.fn(),
  createLinkToken: vi.fn(() => 'token-raw'),
  deletePhoto: vi.fn(),
  findAssignmentByTokenHash: vi.fn(),
  findPhoto: vi.fn(),
  hashToken: vi.fn((token: string) => `hash:${token}`),
  insertPhoto: vi.fn(),
  linkExpiresAt: vi.fn(() => new Date('2030-01-01T00:00:00Z')),
  listActiveAssignments: vi.fn(),
  listPhotos: vi.fn(),
  revokeAssignment: vi.fn(),
  rotateLink: vi.fn(),
  saveLocation: vi.fn(),
  saveStage: vi.fn(),
  stageOf: vi.fn(),
  syncBookingStatus: vi.fn(),
  touchLocationSharing: vi.fn(),
}));
const db = vi.hoisted(() => ({ pool: { query: vi.fn(), execute: vi.fn() } }));

vi.mock('../src/model/cleaner-task.model.js', () => taskModel);
vi.mock('../src/lib/db.js', () => db);

import { createApp } from '../src/app.js';

const app = createApp();
const secret = process.env.JWT_SECRET ?? 'cleango-development-only';
const adminToken = jwt.sign({ id: 1, email: 'a@e.com', role: 'admin' }, secret);

const row = {
  assignmentId: 7,
  bookingId: 9,
  customerId: 10,
  cleanerId: 3,
  linkStatus: 'active',
  linkExpiresAt: new Date('2030-01-01T00:00:00Z'),
  updatedAt: new Date('2026-10-01T00:00:00Z'),
  orderStatus: 'assigned',
  customerName: 'Budi',
  customerPhone: '08123',
  address: 'Jl Test',
  serviceName: 'Deep Cleaning',
  staffName: 'Sari',
  orderDate: '2026-10-20',
  orderTime: '09:00',
  notes: '',
  locationSharingStartedAt: null,
  departedAt: null,
  arrivedAt: null,
  startedAt: null,
  completedAt: null,
  summary: null,
  reportChecked: null,
};

beforeEach(() => {
  Object.values(taskModel).forEach((mock: unknown) => {
    if (
      mock &&
      typeof (mock as { mockReset?: unknown }).mockReset === 'function'
    ) {
      (mock as ReturnType<typeof vi.fn>).mockReset();
    }
  });
  db.pool.query.mockReset();
  db.pool.execute.mockReset();
  taskModel.hashToken.mockImplementation((token: string) => `hash:${token}`);
  taskModel.createLinkToken.mockReturnValue('token-raw');
  taskModel.linkExpiresAt.mockReturnValue(new Date('2030-01-01T00:00:00Z'));
  taskModel.stageOf.mockReturnValue('assigned');
  taskModel.findAssignmentByTokenHash.mockResolvedValue(row);
  taskModel.listPhotos.mockResolvedValue([]);
  taskModel.listActiveAssignments.mockResolvedValue([row]);
  db.pool.query.mockResolvedValue([[{ id: 3, name: 'Sari' }], []]);
  db.pool.execute.mockResolvedValue([{}, []]);
});

describe('cleaner task page token', () => {
  it('rejects a missing token', async () => {
    const response = await request(app).get('/api/cleaner-task');
    expect(response.status).toBe(401);
  });

  it('rejects an unknown token', async () => {
    taskModel.findAssignmentByTokenHash.mockResolvedValue(null);
    const response = await request(app)
      .get('/api/cleaner-task')
      .set('Authorization', 'Bearer deadbeef');
    expect(response.status).toBe(404);
  });

  it('returns the public task allowlist for a valid token', async () => {
    const response = await request(app)
      .get('/api/cleaner-task')
      .set('Authorization', 'Bearer good-token');
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      orderId: '9',
      staffName: 'Sari',
      stage: 'assigned',
      demo: false,
    });
  });

  it('does not leak the stored token hash', async () => {
    const response = await request(app)
      .get('/api/cleaner-task')
      .set('Authorization', 'Bearer good-token');
    expect(JSON.stringify(response.body)).not.toContain('hash:good-token');
  });

  it('requires an idempotency key for stage events', async () => {
    const response = await request(app)
      .post('/api/cleaner-task/events')
      .set('Authorization', 'Bearer good-token')
      .send({ kind: 'depart' });
    expect(response.status).toBe(400);
    expect(taskModel.saveStage).not.toHaveBeenCalled();
  });

  it('advances stage on depart and syncs booking status', async () => {
    const response = await request(app)
      .post('/api/cleaner-task/events')
      .set('Authorization', 'Bearer good-token')
      .set('Idempotency-Key', 'abc-123-key')
      .send({ kind: 'depart' });
    expect(response.status).toBe(200);
    expect(taskModel.saveStage).toHaveBeenCalledWith(7, 'en_route');
    expect(taskModel.syncBookingStatus).toHaveBeenCalledWith(9, 'en_route');
  });

  it('rejects an unknown event kind', async () => {
    const response = await request(app)
      .post('/api/cleaner-task/events')
      .set('Authorization', 'Bearer good-token')
      .set('Idempotency-Key', 'abc-123-key')
      .send({ kind: 'hijack' });
    expect(response.status).toBe(400);
  });

  it.each([null, '', true, 91, '0'])(
    'rejects invalid GPS latitude %j without saving it',
    async (latitude) => {
      const response = await request(app)
        .post('/api/cleaner-task/events')
        .set('Authorization', 'Bearer good-token')
        .set('Idempotency-Key', 'gps-test-123')
        .send({ kind: 'location', latitude, longitude: 112.61 });
      expect(response.status).toBe(400);
      expect(taskModel.saveLocation).not.toHaveBeenCalled();
    },
  );

  it('returns the saved GPS with its real timestamp', async () => {
    taskModel.findAssignmentByTokenHash.mockResolvedValue({
      ...row,
      latitude: -7.97,
      longitude: 112.61,
      locationUpdatedAt: Date.parse('2026-10-25T02:00:00Z'),
    });
    const response = await request(app)
      .get('/api/cleaner-task')
      .set('Authorization', 'Bearer good-token');
    expect(response.body.data.location).toEqual({
      latitude: -7.97,
      longitude: 112.61,
      updatedAt: '2026-10-25T02:00:00.000Z',
    });
  });

  it('does not restart working or completed tasks on repeated arrival', async () => {
    for (const stage of ['working', 'completed']) {
      taskModel.stageOf.mockReturnValue(stage);
      const response = await request(app)
        .post('/api/cleaner-task/events')
        .set('Authorization', 'Bearer good-token')
        .set('Idempotency-Key', 'arrive-test-123')
        .send({ kind: 'arrive' });
      expect(response.status).toBe(200);
    }
    expect(taskModel.saveStage).not.toHaveBeenCalled();
    expect(taskModel.syncBookingStatus).not.toHaveBeenCalled();
  });

  it('does not manufacture a work start when completing before work begins', async () => {
    const response = await request(app)
      .post('/api/cleaner-task/events')
      .set('Authorization', 'Bearer good-token')
      .set('Idempotency-Key', 'complete-test-123')
      .send({ kind: 'complete', summary: 'Uji laporan' });
    expect(response.status).toBe(409);
    expect(taskModel.saveStage).not.toHaveBeenCalled();
  });

  it('rejects a non image upload', async () => {
    const response = await request(app)
      .post('/api/cleaner-task/photos')
      .set('Authorization', 'Bearer good-token')
      .set('Content-Type', 'application/pdf')
      .send('x');
    expect(response.status).toBe(400);
    expect(taskModel.insertPhoto).not.toHaveBeenCalled();
  });
});

describe('cleaner task admin', () => {
  it('forbids anonymous access to the task board', async () => {
    expect((await request(app).get('/api/cleaner-tasks')).status).toBe(401);
  });

  it('forbids a customer token on the task board', async () => {
    const customerToken = jwt.sign(
      { id: 10, email: 'c@e.com', role: 'customer' },
      secret,
    );
    const response = await request(app)
      .get('/api/cleaner-tasks')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(response.status).toBe(403);
  });

  it('lists assigned orders for admins', async () => {
    const response = await request(app)
      .get('/api/cleaner-tasks')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.items[0]).toMatchObject({
      orderId: '9',
      staffName: 'Sari',
    });
  });

  it('creates an assignment with a hashed token on dispatch', async () => {
    const response = await request(app)
      .post('/api/orders/9/cleaner-tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ staffName: 'Sari' });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    const params = db.pool.execute.mock.calls.at(-1)?.[1] as unknown[];
    expect(params).toContain('hash:token-raw');
    expect(params).not.toContain('token-raw');
  });

  it('rejects dispatch without a staff name', async () => {
    const response = await request(app)
      .post('/api/orders/9/cleaner-tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(response.status).toBe(400);
  });

  it('rejects dispatch for an unknown staff', async () => {
    db.pool.query.mockResolvedValue([[], []]);
    const response = await request(app)
      .post('/api/orders/9/cleaner-tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ staffName: 'Ghost' });
    expect(response.status).toBe(400);
  });
});
