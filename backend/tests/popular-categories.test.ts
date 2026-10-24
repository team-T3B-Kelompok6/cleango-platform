import { describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  query: vi.fn().mockResolvedValue([[]]),
  execute: vi.fn().mockResolvedValue([[]]),
}));
vi.mock('../src/lib/db.js', () => ({ pool: db }));

import { listPopularServiceCategories } from '../src/model/category.model.js';

describe('popular service categories', () => {
  it('counts only completed bookings', async () => {
    await listPopularServiceCategories(8);
    const sql = String(db.query.mock.calls[0]![0]);

    expect(sql).toContain("b.status = 'completed'");
    expect(sql).toContain("c.resource = 'services'");
    expect(sql).toContain('ORDER BY orderCount DESC');
  });

  it('returns every active category, not only the ordered ones', async () => {
    await listPopularServiceCategories(8);
    const sql = String(db.query.mock.calls[0]![0]);

    // No filter on bookings in the outer query: categories with no orders stay.
    expect(sql).toMatch(/FROM service_categories c\s+WHERE c\.resource = 'services' AND c\.is_active = TRUE/);
  });

  it('clamps the limit', async () => {
    await listPopularServiceCategories(999);
    expect(String(db.query.mock.calls[0]![0])).toContain('LIMIT 50');
    db.query.mockClear();
    await listPopularServiceCategories(0);
    expect(String(db.query.mock.calls[0]![0])).toContain('LIMIT 1');
  });
});
