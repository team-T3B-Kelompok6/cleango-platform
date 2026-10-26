import { beforeEach, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn() }));
vi.mock('../src/lib/db.js', () => ({ pool: db }));
import {
  findCustomerTask,
  saveStage,
} from '../src/model/cleaner-task.model.js';
beforeEach(() => {
  db.query.mockReset().mockResolvedValue([[]]);
  db.execute.mockReset().mockResolvedValue([{}]);
});
it('enforces booking ownership inside parameterized SQL', async () => {
  expect(await findCustomerTask(10, 9)).toBeNull();
  expect(db.query).toHaveBeenCalledWith(
    expect.stringContaining('WHERE b.customer_id = ? AND b.id = ?'),
    [10, 9],
  );
  expect(db.query.mock.calls[0]![0]).toContain(
    'UNIX_TIMESTAMP(bs.location_updated_at) * 1000',
  );
});
it.each(['en_route', 'working', 'completed'] as const)(
  'preserves the first timestamp for retried stage %s and binds every placeholder',
  async (stage) => {
    await saveStage(7, stage);
    const [sql, params] = db.execute.mock.calls[0]!;
    expect(sql).toContain('COALESCE(');
    expect(params).toEqual([7]);
    expect(sql.match(/\?/g)).toHaveLength(params.length);
  },
);
it('binds the report and confirmation without an extra assignment parameter', async () => {
  await saveStage(7, 'completed', 'Laporan uji', true);
  const [sql, params] = db.execute.mock.calls[0]!;
  expect(params).toEqual([7, 'Laporan uji', 1]);
  expect(sql.match(/\?/g)).toHaveLength(params.length);
});
