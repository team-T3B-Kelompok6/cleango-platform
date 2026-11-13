import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getConnection: vi.fn(), push: vi.fn() }));
vi.mock('../src/lib/db.js', () => ({ pool: { getConnection: mocks.getConnection } }));
vi.mock('../src/lib/firebase-push.js', () => ({ notifyCustomerNotification: mocks.push }));
import { syncBookingStatus } from '../src/model/cleaner-task.model.js';

let status: string;
let payment: { method: string; status: string };
let committed: boolean;
let released: boolean;
let nextId: number;
let failCommit: boolean;
let writes: string[];

beforeEach(() => {
  status = 'assigned'; payment = { method: 'qris', status: 'paid' };
  committed = false; released = false; nextId = 100; failCommit = false; writes = [];
  mocks.push.mockReset().mockImplementation(async () => {
    expect(committed).toBe(true); expect(released).toBe(true);
  });
  mocks.getConnection.mockResolvedValue({
    beginTransaction: vi.fn(),
    commit: vi.fn(async () => { if (failCommit) throw new Error('commit failed'); committed = true; }),
    rollback: vi.fn(),
    release: vi.fn(() => { released = true; }),
    execute: vi.fn(async (sql: string, args: unknown[] = []) => {
      if (sql.includes('FROM bookings')) return [[{ status, customerId: 4, code: 'BK-9', total: 1000 }]];
      if (sql.includes('FROM payments')) return [[payment]];
      writes.push(sql);
      if (sql.startsWith('UPDATE bookings')) status = String(args[0]);
      if (sql.startsWith('UPDATE payments')) payment.status = 'paid';
      return [{ insertId: ++nextId, affectedRows: 1 }];
    }),
  });
});

it('writes one durable order alert and sends after commit/release, repeated cleaner event is no-op', async () => {
  await syncBookingStatus(9, 'working');
  await syncBookingStatus(9, 'working');
  expect(writes.filter((sql) => sql.includes('INSERT INTO notifications'))).toHaveLength(1);
  expect(mocks.push).toHaveBeenCalledOnce();
  expect(mocks.push).toHaveBeenCalledWith(expect.objectContaining({ userId: 4, bookingId: 9, type: 'order' }));
});
it('blocks awaiting payment booking even before payment-row lookup', async () => {
  status = 'awaiting_payment';
  await expect(syncBookingStatus(9, 'assigned')).rejects.toMatchObject({ code: 'PAYMENT_REQUIRED' });
  expect(writes).toEqual([]);
  expect(mocks.push).not.toHaveBeenCalled();
});
it('blocks unpaid noncash work before any status or notification writes', async () => {
  payment.status = 'pending';
  await expect(syncBookingStatus(9, 'working')).rejects.toMatchObject({ code: 'PAYMENT_REQUIRED' });
  expect(writes).toEqual([]);
  expect(mocks.push).not.toHaveBeenCalled();
});
it('cash completion emits both completed and payment accepted once', async () => {
  status = 'in_progress'; payment = { method: 'cash', status: 'pending' };
  await syncBookingStatus(9, 'completed');
  await syncBookingStatus(9, 'completed');
  expect(writes.filter((sql) => sql.includes('INSERT INTO notifications'))).toHaveLength(2);
  expect(mocks.push).toHaveBeenCalledTimes(2);
  expect(mocks.push).toHaveBeenCalledWith(expect.objectContaining({ type: 'payment' }));
});
it('commit failure cannot send push', async () => {
  failCommit = true;
  await expect(syncBookingStatus(9, 'working')).rejects.toThrow('commit failed');
  expect(mocks.push).not.toHaveBeenCalled();
});
