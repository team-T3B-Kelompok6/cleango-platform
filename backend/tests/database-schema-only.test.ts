import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  query: vi.fn(),
  end: vi.fn(),
  connect: vi.fn(),
}));
vi.mock('dotenv/config', () => ({}));
vi.mock('mysql2/promise', () => ({
  default: { createConnection: db.connect },
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('DB_HOST', '127.0.0.1');
  vi.stubEnv('DB_NAME', 'cleango');
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubGlobal('process', {
    ...process,
    argv: ['node', 'apply-database.mjs', '--schema-only'],
  });
  db.connect.mockResolvedValue({ query: db.query, end: db.end });
  db.query.mockImplementation(async (sql: string, values?: string[]) => {
    if (sql === 'SELECT DATABASE() AS name') return [[{ name: 'cleango' }]];
    if (sql.includes('information_schema.tables')) return [[{ exists: 1 }]];
    if (
      sql.includes('information_schema.statistics') &&
      values?.includes('uq_service_categories_name')
    ) {
      return [[{ exists: 1 }]];
    }
    return [[]];
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Putra schema-only migration', () => {
  it('applies table definitions and additive columns without the seed', async () => {
    // @ts-expect-error Existing migration is a JavaScript CLI, not a typed module.
    await import('../scripts/apply-database.mjs');
    const queries = db.query.mock.calls.map(([sql]) => String(sql));
    expect(
      queries.some((sql) =>
        sql.startsWith('CREATE TABLE IF NOT EXISTS cleaner_task_stages'),
      ),
    ).toBe(true);
    expect(
      queries.some((sql) => sql.includes('ADD COLUMN `auth_provider`')),
    ).toBe(true);
    expect(
      queries.some(
        (sql) =>
          sql.includes('ADD UNIQUE KEY `uq_categories_resource_name`') &&
          sql.includes('DROP INDEX `uq_service_categories_name`'),
      ),
    ).toBe(true);
    expect(queries.filter((sql) => /^INSERT/i.test(sql))).toHaveLength(1);
    expect(queries.find((sql) => /^INSERT/i.test(sql))).toContain(
      'SELECT DISTINCT f.category',
    );
    expect(
      queries.some((sql) =>
        /INSERT INTO users|ON DUPLICATE KEY UPDATE|DROP TABLE|DELETE FROM/i.test(
          sql,
        ),
      ),
    ).toBe(false);
    expect(db.end).toHaveBeenCalledOnce();
  });

  it('refuses another database before opening a connection', async () => {
    vi.stubEnv('DB_NAME', 'other_database');
    // @ts-expect-error Existing migration is a JavaScript CLI, not a typed module.
    await expect(import('../scripts/apply-database.mjs')).rejects.toThrow(
      'cleango lokal',
    );
    expect(db.connect).not.toHaveBeenCalled();
  });
});
