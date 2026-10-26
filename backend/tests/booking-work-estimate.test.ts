import { beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock('../src/lib/db.js', () => ({ pool: db }));
import {
  BOOKING_SLOTS,
  listAvailability,
  listCustomerBookings,
  slotUsage,
} from '../src/model/booking.model.js';
import { estimateWorkCompletion } from '../src/lib/work-estimate.js';

beforeEach(() => db.execute.mockReset());

describe('hourly booking slot capacity after merging Putra', () => {
  it('counts the new hourly slots without dropping unused slots', async () => {
    db.execute.mockResolvedValue([[
      { slot: '09:00', total: '3' },
      { slot: '11:00', total: 2 },
      { slot: '15:00', total: 1 },
      { slot: '09:30', total: 7 },
    ]]);

    const usage = await slotUsage('2026-11-01');

    expect(Object.keys(usage)).toEqual([...BOOKING_SLOTS]);
    expect(usage['09:00']).toBe(3);
    expect(usage['11:00']).toBe(2);
    expect(usage['15:00']).toBe(1);
    expect(usage['08:00']).toBe(0);
    expect(usage).not.toHaveProperty('09:30');
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining("status NOT IN ('cancelled', 'rescheduled')"),
      ['2026-11-01'],
    );
  });

  it('closes a full new slot while keeping the other hourly slots open', async () => {
    db.execute.mockResolvedValue([[{ slot: '09:00', total: 3 }]]);

    const board = await listAvailability('2099-01-01');

    expect(board.slots.map((slot) => slot.time)).toEqual([...BOOKING_SLOTS]);
    expect(board.slots.find((slot) => slot.time === '09:00')).toEqual({
      time: '09:00', available: false, reason: 'Slot sudah penuh.',
    });
    expect(board.slots.find((slot) => slot.time === '10:00')?.available).toBe(true);
  });
});

describe('booking duration and timestamp contract', () => {
  it('scopes bookings to the customer and reads the real start as epoch milliseconds', async () => {
    const row = {
      startedAt: Date.parse('2026-10-25T09:00:00+07:00'),
      serviceDurationMinutes: 120,
    };
    db.execute.mockResolvedValue([[row]]);
    const rows = await listCustomerBookings(10);
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('WHERE b.customer_id = ?'),
      [10],
    );
    expect(db.execute.mock.calls[0]![0]).toContain(
      'UNIX_TIMESTAMP(bs.started_at) * 1000 AS startedAt',
    );
    expect(
      estimateWorkCompletion(
        rows[0]!.startedAt,
        rows[0]!.serviceDurationMinutes,
      ),
    ).toBe('2026-10-25T04:00:00.000Z');
  });
});
