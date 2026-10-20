import { describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({
  execute: vi.fn().mockResolvedValue([[]]),
  query: vi.fn().mockResolvedValue([[]]),
}));
vi.mock('../src/lib/db.js', () => ({ pool: db }));
import { findChatOrder, listChatPromos } from '../src/model/chatbot.model.js';
describe('chat read-only SQL boundaries', () => {
  it('binds both customer ownership and explicit order reference in one query', async () => {
    await findChatOrder(7, 'CL-123');
    const [sql, parameters] = db.execute.mock.calls[0]!;
    expect(sql).toContain('b.customer_id = ?');
    expect(sql).toContain('u.is_active = 1');
    expect(parameters).toEqual([7, 'CL-123', 'CL-123', 'CL-123']);
    expect(sql).not.toMatch(
      /INSERT|UPDATE|DELETE|street_address|phone|gateway_reference/,
    );
  });
  it('only reads currently active, unexpired promos with quota', async () => {
    await listChatPromos();
    const sql = db.query.mock.calls[0]![0];
    expect(sql).toContain('is_active = 1');
    expect(sql).toContain('starts_at <= NOW() AND ends_at > NOW()');
    expect(sql).toContain('used_count < quota');
  });
});
