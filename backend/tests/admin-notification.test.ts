import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockExecute = vi.hoisted(() => vi.fn());

vi.mock('../src/lib/db.js', () => ({
  pool: { execute: mockExecute },
}));

import { markAdminNotificationsRead, listAdminReadReceipts } from '../src/model/admin-notification.model.js';

beforeEach(() => {
  mockExecute.mockReset();
});

describe('markAdminNotificationsRead', () => {
  it('returns 0 for empty booking IDs', async () => {
    const count = await markAdminNotificationsRead(1, []);
    expect(count).toBe(0);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('inserts receipts with flat placeholders for up to 8 IDs', async () => {
    mockExecute.mockResolvedValue([{ affectedRows: 3 }]);
    const count = await markAdminNotificationsRead(7, [101, 102, 103]);
    expect(count).toBe(3);
    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain('INSERT INTO admin_notification_receipts');
    expect(sql).toContain('ON DUPLICATE KEY UPDATE');
    expect(Array.isArray(params)).toBe(true);
    expect(params.length).toBe(6);
    expect(params).toEqual([7, 101, 7, 102, 7, 103]);
  });

  it('limits to max 8 booking IDs', async () => {
    mockExecute.mockResolvedValue([{ affectedRows: 8 }]);
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    await markAdminNotificationsRead(7, ids);
    const [sql, params] = mockExecute.mock.calls[0];
    const valueCount = (sql.match(/\(\?, \?, NOW\(\)\)/g) ?? []).length;
    expect(valueCount).toBe(8);
    expect(params.length).toBe(16);
  });

  it('is idempotent on duplicate admin/booking pair', async () => {
    mockExecute.mockResolvedValue([{ affectedRows: 2 }]);
    const count = await markAdminNotificationsRead(7, [101]);
    expect(count).toBe(2);
    const [sql] = mockExecute.mock.calls[0];
    expect(sql).toContain('ON DUPLICATE KEY UPDATE');
  });

  it('only marks for the given admin id', async () => {
    mockExecute.mockResolvedValue([{ affectedRows: 1 }]);
    await markAdminNotificationsRead(9, [50]);
    const [, params] = mockExecute.mock.calls[0];
    expect(params[0]).toBe(9);
    expect(params[1]).toBe(50);
  });

  it('throws 400 INVALID_BOOKING_IDS when bookingIds is not an array', async () => {
    await expect(markAdminNotificationsRead(1, null as unknown as number[])).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_BOOKING_IDS',
    });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it.each([
    [-1],
    [0],
    [1.5],
    [NaN],
    [Infinity],
    ['101'],
  ])('throws 400 INVALID_BOOKING_IDS and does not call DB for %p', async (ids) => {
    await expect(markAdminNotificationsRead(1, ids as unknown as number[])).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_BOOKING_IDS',
    });
    expect(mockExecute).not.toHaveBeenCalled();
  });
});

describe('listAdminReadReceipts', () => {
  it('returns read booking IDs for the given admin', async () => {
    mockExecute.mockResolvedValue([[{ booking_id: 101 }, { booking_id: 102 }]]);
    const ids = await listAdminReadReceipts(7);
    expect(ids).toEqual([101, 102]);
    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain('admin_notification_receipts');
    expect(sql).toContain('WHERE admin_id = ?');
    expect(params).toEqual([7]);
  });

  it('returns empty array when no receipts exist', async () => {
    mockExecute.mockResolvedValue([[]]);
    const ids = await listAdminReadReceipts(7);
    expect(ids).toEqual([]);
  });

  it('does not leak receipts between admins', async () => {
    mockExecute.mockResolvedValue([[{ booking_id: 101 }]]);
    await listAdminReadReceipts(7);
    const [, params] = mockExecute.mock.calls[0];
    expect(params[0]).toBe(7);

    mockExecute.mockResolvedValue([[{ booking_id: 202 }]]);
    await listAdminReadReceipts(8);
    const [, params2] = mockExecute.mock.calls[1];
    expect(params2[0]).toBe(8);
  });
});