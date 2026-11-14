import { describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn() }));
vi.mock('../src/lib/db.js', () => ({ pool: db }));
import {
  findCategories,
  findCategoryById,
  insertCategory,
  updateCategoryById,
} from '../src/model/category.model.js';

describe('category model without photo target mapping', () => {
  it('does not read or write legacy ai_targets column', async () => {
    const row = { id: 1, name: 'Motor', resource: 'services' };
    db.query.mockResolvedValue([[row]]);
    db.execute.mockResolvedValue([{ insertId: 1, affectedRows: 1 }]);
    expect(await findCategories(false)).toEqual([row]);
    expect(await findCategoryById(1, false)).toEqual(row);
    await insertCategory({
      name: 'Motor',
      description: null,
      icon: null,
      isActive: true,
    });
    await updateCategoryById(1, { name: 'Kendaraan' });
    for (const [sql] of [...db.query.mock.calls, ...db.execute.mock.calls])
      expect(sql).not.toMatch(/ai_targets|aiTargets/);
  });
});
