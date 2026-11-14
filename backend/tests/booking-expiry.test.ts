import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  execute: vi.fn(),
  query: vi.fn(),
  getConnection: vi.fn(),
}));

vi.mock('../src/lib/db.js', () => ({ pool: db }));

import {
  expireExpiredAwaitingBookings,
} from '../src/model/booking.model.js';

describe('expireExpiredAwaitingBookings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cancels expired awaiting_payment bookings and releases promo and payments', async () => {
    const expiredRows = [
      { id: 101, promo_id: 5 },
      { id: 102, promo_id: null },
    ];
    db.execute.mockResolvedValueOnce([expiredRows]);
    db.query.mockResolvedValue([{ affectedRows: 2 }]);

    const count = await expireExpiredAwaitingBookings(db as never);
    expect(count).toBe(2);

    // Verify bookings cancelled
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE bookings SET status = 'cancelled'"),
      [[101, 102]],
    );

    // Verify payments expired
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE payments SET status = 'expired'"),
      [[101, 102]],
    );

    // Verify promo released for booking 101
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE promos SET used_count = GREATEST(0, used_count - 1)'),
      [5],
    );
  });

  it('does nothing when no bookings are expired', async () => {
    db.execute.mockResolvedValueOnce([[]]);
    const count = await expireExpiredAwaitingBookings(db as never);
    expect(count).toBe(0);
    expect(db.query).not.toHaveBeenCalled();
  });
});
