import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { listAudit, writeAudit } from '../src/model/audit.model.ts';
import { auditRouter } from '../src/routes/audit.routes.ts';

function fakeDb(row: Record<string, unknown>) {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const db = {
    async execute(sql: string, params: unknown[] = []) {
      calls.push({ sql, params });
      if (sql.startsWith('INSERT')) return [{ insertId: 9 }];
      if (sql.includes('COUNT')) return [[{ total: 1 }]];
      if (sql.includes('DISTINCT')) return [[{ id: 1, name: 'Admin Operasional' }]];
      return [[row]];
    },
  };
  return { db, calls };
}

describe('admin audit', () => {
  it('menyimpan tanpa token dan tidak mengembalikan password historis', async () => {
    const { db, calls } = fakeDb({
      id: 9,
      admin_id: 1,
      admin_name: 'Admin Operasional',
      action: 'update',
      entity_type: 'schedules',
      entity_id: 3,
      old_values: JSON.stringify({ date: '2026-10-20', password: 'rahasia' }),
      new_values: JSON.stringify({ date: '2026-10-21', summary: 'Ubah jadwal' }),
      created_at: '2026-10-21T02:30:00.000Z',
    });
    const id = await writeAudit(db as never, {
      adminId: 1,
      action: 'update',
      entityType: 'schedules',
      entityId: 3,
      summary: 'Ubah jadwal',
      before: { date: '2026-10-20', token: 'rahasia' },
      after: { date: '2026-10-21' },
    });
    assert.equal(id, 9);
    assert.equal(JSON.parse(String(calls[0]?.params[4])).token, undefined);
    const page = await listAudit(db as never, { from: '2026-10-20', to: '2026-10-20', page: 1 });
    assert.equal(page.meta.total, 1);
    assert.equal(page.data[0]?.summary, 'Ubah jadwal');
    assert.equal(page.data[0]?.before?.password, undefined);
    assert.equal(calls.at(-2)?.params[0], '2026-10-19 17:00:00');
  });

  it('membuang secret bersarang saat GET', async () => {
    const { db } = fakeDb({
      id: 10,
      admin_id: 1,
      admin_name: 'Admin Operasional',
      action: 'update',
      entity_type: 'schedules',
      entity_id: 4,
      old_values: JSON.stringify({
        date: '2026-10-20',
        password: 'rahasia',
        staff: { name: 'Ani', password: 'rahasia', shifts: [{ time: '08:00', secret: 'z' }] },
      }),
      new_values: JSON.stringify({ summary: 'Ubah jadwal', date: '2026-10-21' }),
      created_at: '2026-10-21T02:30:00.000Z',
    });
    const page = await listAudit(db as never, { page: 1 });
    const before = page.data[0]?.before;
    const staff = before?.staff as { name?: string; password?: string; shifts?: Array<{ time?: string; secret?: string }> };
    assert.equal(before?.password, undefined);
    assert.equal(staff.name, 'Ani');
    assert.equal(staff.password, undefined);
    assert.equal(staff.shifts?.[0]?.secret, undefined);
    assert.equal(staff.shifts?.[0]?.time, '08:00');
  });

  it('GET mewajibkan autentikasi admin', () => {
    const stack = (auditRouter as unknown as {
      stack: Array<{ name: string; route?: { path: string; methods: { get?: boolean } } }>;
    }).stack;
    assert.equal(stack.some((layer) => layer.name === 'authenticate'), true);
    assert.equal(stack.some((layer) => layer.name === 'requireAdmin'), true);
    assert.equal(stack.some((layer) => layer.route?.path === '/' && layer.route.methods.get === true), true);
  });
});
