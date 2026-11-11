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
    if (sql.includes('SELECT email, role, is_active AS isActive'))
      return [[{ email: 'admin@cleango.id', role: 'admin', isActive: 1 }]];
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
      queries.some((sql) => sql.includes('ADD CONSTRAINT `fk_cleaners_trainer` FOREIGN KEY (`trainer_id`)')),
    ).toBe(true);
    expect(queries.filter((sql) => sql.includes('ADD CONSTRAINT `fk_cleaners_trainer`'))).toHaveLength(1);
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
    expect(queries).toContain(
      'ALTER TABLE cleango.`cleaners` ADD COLUMN `trainer_id` BIGINT UNSIGNED NULL AFTER `skills`',
    );
    expect(queries).toContain(
      'ALTER TABLE cleango.`cleaners` ADD INDEX `idx_cleaners_trainer` (`trainer_id`)',
    );
    const categoryPromotion = queries.filter((sql) => sql.includes('SELECT DISTINCT f.category'));
    expect(categoryPromotion).toHaveLength(0);
    expect(queries.some((sql) => /INSERT INTO (?:cleango\.)?(?:users|services|cleaners|faqs)\b|ON DUPLICATE KEY UPDATE|DROP TABLE|DELETE FROM/i.test(sql))).toBe(false);
    expect(
      queries.some((sql) =>
        /INSERT INTO users|ON DUPLICATE KEY UPDATE|DROP TABLE|DELETE FROM/i.test(
          sql,
        ),
      ),
    ).toBe(false);
    expect(db.end).toHaveBeenCalledOnce();
  });

  it('does not recreate existing trainer columns or indexes on repeated migration', async () => {
    const initialQuery = db.query.getMockImplementation()!;
    db.query.mockImplementation(async (sql: string, values?: string[]) => {
      if (
        (sql.includes('information_schema.columns') && values?.includes('trainer_id')) ||
        (sql.includes('information_schema.statistics') && values?.includes('idx_cleaners_trainer')) ||
        (sql.includes('information_schema.table_constraints') && values?.includes('fk_cleaners_trainer'))
      ) return [[{ exists: 1 }]];
      return initialQuery(sql, values);
    });
    const migration = '../scripts/apply-database.mjs';
    await import(migration);
    const queries = db.query.mock.calls.map(([sql]) => String(sql));
    expect(queries.some((sql) => /ALTER TABLE[^;]*(?:trainer_id|idx_cleaners_trainer)/i.test(sql))).toBe(false);
    expect(queries.some((sql) => /INSERT INTO users|ON DUPLICATE KEY UPDATE|DROP TABLE|DELETE FROM/i.test(sql))).toBe(false);
    expect(db.end).toHaveBeenCalledOnce();
  });

  it('requires explicit seed flag before executing reference seed data', async () => {
    vi.stubGlobal('process', {
      ...process,
      argv: ['node', 'apply-database.mjs', '--seed'],
    });
    // @ts-expect-error Existing migration is a JavaScript CLI, not a typed module.
    await import('../scripts/apply-database.mjs');
    const queries = db.query.mock.calls.map(([sql]) => String(sql));
    expect(queries.some((sql) => sql.includes('INSERT INTO users'))).toBe(true);
    expect(queries.some((sql) => sql.includes('INSERT INTO services'))).toBe(true);
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
