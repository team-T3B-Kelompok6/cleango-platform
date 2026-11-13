import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn(), getConnection: vi.fn() }));
const push = vi.hoisted(() => ({ notifyCustomerNotification: vi.fn().mockResolvedValue(undefined) }));

vi.mock('../src/lib/db.js', () => ({ pool: db }));
vi.mock('../src/lib/firebase-push.js', () => push);

import { updateBookingById } from '../src/model/order.model.js';

let inTransaction = false;
let committed = false;
let notifications: Array<{ userId: number; bookingId: number; type: string; title: string; message: string }> = [];

function makeConnection() {
  const conn = {
    beginTransaction: vi.fn(async () => {
      inTransaction = true;
      committed = false;
    }),
    commit: vi.fn(async () => {
      inTransaction = false;
      committed = true;
    }),
    rollback: vi.fn(async () => {
      inTransaction = false;
    }),
    release: vi.fn(),
    execute: vi.fn(async (sql: string, args: unknown[] = []): Promise<unknown[]> => {
      if (sql.includes('GET_LOCK') || sql.includes('RELEASE_LOCK')) {
        return [[{ ok: 1 }]];
      }
      if (sql.includes('FROM bookings WHERE id = ? FOR UPDATE')) {
        return [[{
          status: 'confirmed',
          code: 'BK-123',
          customerId: 42,
          addressId: 1,
          serviceId: 2,
          duration: 60,
          date: '2026-11-20',
          time: '10:00',
          onHold: 0,
        }]];
      }
      if (sql.includes('FROM payments')) return [[]];
      if (sql.includes('INSERT INTO notifications')) {
        expect(inTransaction).toBe(true);
        notifications.push({
          userId: Number(args[0]),
          bookingId: Number(args[1]),
          type: String(args[2]),
          title: String(args[3]),
          message: String(args[4]),
        });
        return [{ insertId: 99 }];
      }
      if (sql.includes('UPDATE bookings') || sql.includes('INSERT INTO booking_status_history')) {
        return [{ affectedRows: 1 }];
      }
      return [[]];
    }),
  };
  return conn;
}

beforeEach(() => {
  inTransaction = false;
  committed = false;
  notifications = [];
  push.notifyCustomerNotification.mockReset().mockImplementation(async () => {
    expect(inTransaction).toBe(false);
    expect(committed).toBe(true);
  });
  db.getConnection.mockReset().mockImplementation(async () => makeConnection());
  db.query.mockReset().mockImplementation(async () => [[{ id: 10, customer: 'Budi' }]]);
  db.execute.mockReset();
});

describe('order.model status notification wiring', () => {
  it('persists notification in transaction and dispatches push only post-commit', async () => {
    await updateBookingById(10, { status: 'Menuju Lokasi' });

    expect(committed).toBe(true);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      userId: 42,
      bookingId: 10,
      type: 'order',
      title: 'Status pesanan: Menuju Lokasi',
      message: 'Pesanan BK-123: Menuju Lokasi.',
    });
    expect(push.notifyCustomerNotification).toHaveBeenCalledOnce();
    expect(push.notifyCustomerNotification).toHaveBeenCalledWith({
      notificationId: '99',
      userId: 42,
      bookingId: 10,
      type: 'order',
      title: 'Status pesanan: Menuju Lokasi',
      message: 'Pesanan BK-123: Menuju Lokasi.',
    });
  });

  it('never dispatches push when commit fails', async () => {
    const conn = makeConnection();
    conn.commit.mockRejectedValueOnce(new Error('commit failed'));
    db.getConnection.mockResolvedValueOnce(conn);
    await expect(updateBookingById(10, { status: 'Menuju Lokasi' })).rejects.toThrow('commit failed');
    expect(push.notifyCustomerNotification).not.toHaveBeenCalled();
    expect(conn.rollback).toHaveBeenCalled();
  });

  it('does not send notification when status did not change', async () => {
    await updateBookingById(10, { notes: 'catatan tambahan' });

    expect(notifications).toHaveLength(0);
    expect(push.notifyCustomerNotification).not.toHaveBeenCalled();
  });
});
