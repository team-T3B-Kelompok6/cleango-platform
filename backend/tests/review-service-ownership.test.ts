import { beforeEach, describe, expect, it, vi } from 'vitest';

const connection = vi.hoisted(() => ({
  execute: vi.fn(), beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn(),
}));
vi.mock('../src/lib/db.js', () => ({ pool: { getConnection: async () => connection } }));
import { createBookingReview, updateBookingReview } from '../src/model/review.model.js';

beforeEach(() => {
  vi.clearAllMocks();
  connection.execute.mockImplementation(async (sql: string) => {
    if (sql.startsWith('SELECT b.id')) return [[{
      id: 12, customerId: 3, serviceId: 8, cleanerId: 99,
      status: 'completed', completedAt: new Date(), reviewId: null,
    }]];
    return [{ insertId: 7 }];
  });
});

describe('review belongs to service, not assigned cleaner', () => {
  it('creates service review without a cleaner link or cleaner rating writes', async () => {
    expect(await createBookingReview(3, 12, { rating: 5, comment: 'Bersih' })).toEqual({ ok: true, id: 7 });
    const calls = connection.execute.mock.calls;
    expect(calls[0]![0]).not.toContain('cleaner_assignments');
    expect(calls[1]![0]).not.toContain('cleaner_id');
    expect(calls[1]![1]).toEqual([12, 3, 8, 5, 'Bersih']);
    expect(calls.some(([sql]) => String(sql).includes('UPDATE cleaners'))).toBe(false);
    expect(connection.commit).toHaveBeenCalledOnce();
  });

  it('edits existing legacy review without recalculating cleaner rating', async () => {
    connection.execute.mockResolvedValueOnce([[{
      id: 12, serviceId: 8, cleanerId: 99, reviewId: 7,
      status: 'completed', completedAt: new Date(),
    }]]);
    expect(await updateBookingReview(3, 12, { rating: 2, comment: null })).toEqual({ ok: true });
    expect(connection.execute).toHaveBeenCalledTimes(2);
    expect(connection.execute.mock.calls[1]![1]).toEqual([2, null, 7]);
  });
});
