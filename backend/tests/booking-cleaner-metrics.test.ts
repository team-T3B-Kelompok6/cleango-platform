import { beforeEach, describe, expect, it, vi } from 'vitest';
const execute = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/db.js', () => ({ pool: { execute } }));
import { findCustomerBooking, listCustomerBookings } from '../src/model/booking.model.js';

beforeEach(() => execute.mockResolvedValue([[]]));

describe('customer booking cleaner metrics', () => {
  it.each([
    ['detail', () => findCustomerBooking(4, 12)],
    ['list', () => listCustomerBookings(4)],
  ])('%s returns completed unique bookings, not a person rating', async (_label, read) => {
    await read();
    const sql = String(execute.mock.calls.at(-1)![0]);
    expect(sql).not.toContain('average_rating');
    expect(sql).toContain('AS cleanerCompletedBookings');
    expect(sql).toContain('COUNT(DISTINCT completed.id)');
    expect(sql).toContain("completed.status = 'completed'");
    expect(sql).toContain('assigned.cleaner_id = cl.id');
  });
});
