import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('CleanGo database seed', () => {
  it('contains an idempotent admin account with a bcrypt password hash', async () => {
    const sql = await readFile(new URL('../database.sql', import.meta.url), 'utf8');
    const adminInsert = sql.match(
      /INSERT INTO users[\s\S]*?admin@cleango\.id[\s\S]*?ON DUPLICATE KEY UPDATE[\s\S]*?;/,
    )?.[0];

    expect(adminInsert).toBeDefined();
    expect(adminInsert).toMatch(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/);
    expect(adminInsert).not.toContain("'321321'");
    expect(adminInsert).toContain("'admin'");
  });
});
