import { beforeEach, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn(), getConnection: vi.fn() }));
vi.mock('../src/lib/db.js', () => ({ pool: db }));
import { listOrders, updateBookingById } from '../src/model/order.model.js';
import { getReportSummary } from '../src/model/report.model.js';

beforeEach(() => vi.resetAllMocks());

it('filters unpaid electronic payments from admin work queue without deleting reservations', async () => {
  db.query.mockResolvedValue([[]]);
  await expect(listOrders()).resolves.toEqual([]);
  const sql = db.query.mock.calls[0]![0] as string;
  expect(sql).toMatch(/WHERE\s+\(p\.id IS NULL OR p\.method = 'cash' OR p\.status = 'paid'\)/);
  expect(sql).toContain("b.status <> 'awaiting_payment'");
  expect(sql).not.toMatch(/DELETE|UPDATE/);
});

it('excludes unpaid electronic bookings from active dashboard counts', async () => {
  db.execute.mockResolvedValue([[]]);
  await getReportSummary('2026-11-01', '2026-11-30');
  expect(db.execute.mock.calls[0]![0]).toContain("unpaid.method <> 'cash' AND unpaid.status <> 'paid'");
});

it.each(['pending', 'failed', 'expired'].flatMap((paymentStatus) => [
  { input: { status: 'Menunggu Lokasi' }, paymentStatus },
  { input: { staff: ['Cleaner'] }, paymentStatus },
]))('rejects dispatch of unpaid QRIS even through direct admin update %j', async ({ input, paymentStatus }) => {
  const connection = {
    beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn(),
    execute: vi.fn(async (sql: string) => {
      if (sql.includes('GET_LOCK')) return [[{ ok: 1 }]];
      if (sql.includes('FROM bookings')) return [[{ status: 'confirmed', customerId: 10, onHold: 0 }]];
      if (sql.includes('FROM payments')) return [[{ method: 'qris', status: paymentStatus }]];
      return [[]];
    }),
  };
  db.getConnection.mockResolvedValue(connection);
  await expect(updateBookingById(1, input, { type: 'admin', userId: 2 }))
    .rejects.toMatchObject({ statusCode: 409, code: 'PAYMENT_REQUIRED' });
  expect(connection.commit).not.toHaveBeenCalled();
  expect(connection.execute.mock.calls.find(([sql]) => sql.includes('FROM payments'))?.[0]).toContain('FOR UPDATE');
  expect(connection.rollback).toHaveBeenCalled();
  expect(connection.release).toHaveBeenCalled();
  expect(connection.execute.mock.calls.some(([sql]) => /^(INSERT|UPDATE|DELETE)/.test(sql.trim()))).toBe(false);
});

it.each([{ status: 'Menunggu Assign' }, { status: 'Menunggu Lokasi' }, { staff: ['Cleaner'] }])(
  'rejects pre-checkout booking without payment row %j', async (input) => {
    const connection = {
      beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn(),
      execute: vi.fn(async (sql: string) => {
        if (sql.includes('GET_LOCK')) return [[{ ok: 1 }]];
        if (sql.includes('FROM bookings')) return [[{ status: 'awaiting_payment', customerId: 10, onHold: 0 }]];
        return [[]];
      }),
    };
    db.getConnection.mockResolvedValue(connection);
    await expect(updateBookingById(1, input, { type: 'admin', userId: 2 }))
      .rejects.toMatchObject({ code: 'PAYMENT_REQUIRED' });
    expect(connection.commit).not.toHaveBeenCalled();
  },
);

it.each([
  { method: 'cash', status: 'pending' },
  { method: 'qris', status: 'paid' },
  null,
])('allows cash, settled QRIS, or admin-created order without payment: %j', async (payment) => {
  const connection = {
    beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn(),
    execute: vi.fn(async (sql: string) => {
      if (sql.includes('FROM bookings')) return [[{ status: 'confirmed', customerId: 10, onHold: 0 }]];
      if (sql.includes('FROM payments')) return [payment ? [payment] : []];
      return [[]];
    }),
  };
  db.getConnection.mockResolvedValue(connection);
  db.query.mockResolvedValue([[]]);
  await updateBookingById(1, { status: 'Menunggu Lokasi' }, { type: 'admin', userId: 2 });
  expect(connection.commit).toHaveBeenCalledOnce();
});
