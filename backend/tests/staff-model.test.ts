import { beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn() }));
vi.mock('../src/lib/db.js', () => ({ pool: db }));

import {
  findStaff,
  insertStaff,
  listStaff,
  updateStaffById,
  type StaffInput,
} from '../src/model/staff.model.js';

interface StaffRow {
  id: number;
  name: string;
  phone: string;
  area: string;
  photoUrl: string | null;
  skills: string | null;
  databaseStatus: 'available' | 'busy' | 'offline';
  active: number;
  rating: number;
}

function row(overrides: Partial<StaffRow> = {}): StaffRow {
  return {
    id: 1,
    name: 'Sari',
    phone: '08123',
    area: 'Pasar Baru',
    photoUrl: null,
    skills: null,
    databaseStatus: 'available',
    active: 1,
    rating: 4,
    ...overrides,
  };
}

beforeEach(() => {
  db.query.mockReset();
  db.execute.mockReset();
  db.execute.mockResolvedValue([{ insertId: 1 }]);
  db.query.mockResolvedValue([[]]);
});

describe('staff model: row mapping', () => {
  it('maps a null skills column to an empty array (legacy rows)', async () => {
    db.query.mockResolvedValue([[row({ skills: null })]]);
    const found = await findStaff(1);
    expect(found?.skills).toEqual([]);
  });

  it('parses a stored JSON skills array', async () => {
    db.query.mockResolvedValue([
      [row({ skills: JSON.stringify(['AC Repair', 'Carpentry']) })],
    ]);
    const found = await findStaff(1);
    expect(found?.skills).toEqual(['AC Repair', 'Carpentry']);
  });

  it('falls back to an empty array when skills JSON is malformed', async () => {
    db.query.mockResolvedValue([[row({ skills: '{not-json' })]]);
    const found = await findStaff(1);
    expect(found?.skills).toEqual([]);
  });

  it('falls back to an empty array when skills JSON is not an array', async () => {
    db.query.mockResolvedValue([[row({ skills: JSON.stringify('oops') })]]);
    const found = await findStaff(1);
    expect(found?.skills).toEqual([]);
  });

  it('filters non-string entries from a parsed skills array', async () => {
    db.query.mockResolvedValue([
      [row({ skills: JSON.stringify(['Valid', 7, null, 'Also Valid']) })],
    ]);
    const found = await findStaff(1);
    expect(found?.skills).toEqual(['Valid', 'Also Valid']);
  });

  it('maps database status to the API StaffStatus enum', async () => {
    db.query.mockResolvedValue([[row({ databaseStatus: 'busy', active: 1 })]]);
    const found = await findStaff(1);
    expect(found?.status).toBe('Bertugas');
  });

  it('maps inactive staff to Nonaktif regardless of database status', async () => {
    db.query.mockResolvedValue([
      [row({ databaseStatus: 'available', active: 0 })],
    ]);
    const found = await findStaff(1);
    expect(found?.status).toBe('Nonaktif');
  });

  it('maps offline + active as Masa Training', async () => {
    db.query.mockResolvedValue([
      [row({ databaseStatus: 'offline', active: 1 })],
    ]);
    const found = await findStaff(1);
    expect(found?.status).toBe('Masa Training');
  });

  it('coerces a null photoUrl to null on the staff object', async () => {
    db.query.mockResolvedValue([[row({ photoUrl: null })]]);
    const found = await findStaff(1);
    expect(found?.photoUrl).toBeNull();
  });

  it('normalises rows into Staff[] on listStaff', async () => {
    db.query.mockResolvedValue([
      [row({ id: 2, name: 'Budi' }), row({ id: 3, name: 'Ani' })],
    ]);
    const list = await listStaff();
    expect(list).toHaveLength(2);
    expect(list.map((s) => s.id)).toEqual(['2', '3']);
  });
});

describe('staff model: insertStaff parameter binding', () => {
  const base: StaffInput = {
    name: 'Sari',
    phone: '08123',
    area: 'Pasar Baru',
    status: 'Tersedia',
  };

  function sqlParams(): unknown[] {
    return db.execute.mock.calls[0]![1] as unknown[];
  }

  function sqlOf(): string {
    return db.execute.mock.calls[0]![0] as string;
  }

  beforeEach(() => {
    db.execute.mockResolvedValue([{ insertId: 42 }]);
    db.query.mockResolvedValue([[row({ id: 42 })]]);
  });

  it('serialises empty skills as [] json by default', async () => {
    await insertStaff(base);
    expect(sqlParams()).toEqual([
      'Sari',
      '08123',
      'Pasar Baru',
      null,
      '[]',
      'available',
      true,
    ]);
    expect(sqlOf()).toContain('INSERT INTO cleaners');
    expect(sqlOf()).toContain('is_active');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = ? LIMIT 1'),
      [42],
    );
  });

  it('binds a provided photoUrl and skills array', async () => {
    await insertStaff({
      ...base,
      photoUrl: 'https://cdn.example/a.png',
      skills: ['AC Repair', 'Carpentry'],
      status: 'Bertugas',
    });
    expect(sqlParams()).toEqual([
      'Sari',
      '08123',
      'Pasar Baru',
      'https://cdn.example/a.png',
      JSON.stringify(['AC Repair', 'Carpentry']),
      'busy',
      true,
    ]);
  });

  it('binds Nonaktif status as inactive flag false', async () => {
    await insertStaff({ ...base, status: 'Nonaktif' });
    expect(sqlParams()).toEqual([
      'Sari',
      '08123',
      'Pasar Baru',
      null,
      '[]',
      'offline',
      false,
    ]);
  });

  it('binds Masa Training as offline + active', async () => {
    await insertStaff({ ...base, status: 'Masa Training' });
    expect(sqlParams()).toEqual([
      'Sari',
      '08123',
      'Pasar Baru',
      null,
      '[]',
      'offline',
      true,
    ]);
  });

  it('throws when the freshly inserted row cannot be read back', async () => {
    db.query.mockResolvedValue([[]]);
    await expect(insertStaff(base)).rejects.toThrow(
      'Petugas gagal dibaca setelah dibuat',
    );
  });
});

describe('staff model: updateStaffById parameter binding', () => {
  beforeEach(() => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }]);
    db.query.mockResolvedValue([[row()]]);
  });

  it('omits unchanged columns via the IF(flag, value, column) pattern', async () => {
    await updateStaffById(7, { name: 'Budi' });
    const params = db.execute.mock.calls[0]![1] as unknown[];
    expect(params).toEqual([
      true,
      'Budi',
      false,
      '',
      false,
      '',
      false,
      null,
      false,
      '[]',
      false,
      'offline',
      false,
      false,
      7,
    ]);
    const sql = db.execute.mock.calls[0]![0] as string;
    expect(sql).toContain('name = IF(?, ?, name)');
    expect(sql).toContain('WHERE id = ?');
  });

  it('updates photoUrl to null when explicitly patched to null', async () => {
    await updateStaffById(7, { photoUrl: null });
    const params = db.execute.mock.calls[0]![1] as unknown[];
    expect(params).toEqual([
      false,
      '',
      false,
      '',
      false,
      '',
      true,
      null,
      false,
      '[]',
      false,
      'offline',
      false,
      false,
      7,
    ]);
  });

  it('stringifies skills when patched, keeping other columns intact', async () => {
    await updateStaffById(7, { skills: ['A', 'B'] });
    const params = db.execute.mock.calls[0]![1] as unknown[];
    expect(params).toEqual([
      false,
      '',
      false,
      '',
      false,
      '',
      false,
      null,
      true,
      JSON.stringify(['A', 'B']),
      false,
      'offline',
      false,
      false,
      7,
    ]);
  });

  it('returns null when no row is affected', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 0 }]);
    const result = await updateStaffById(7, { name: 'Budi' });
    expect(result).toBeNull();
    expect(db.query).not.toHaveBeenCalled();
  });

  it('reads the row back after a successful update', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }]);
    db.query.mockResolvedValue([[row({ id: 7 })]]);
    await updateStaffById(7, { name: 'Budi' });
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = ? LIMIT 1'),
      [7],
    );
  });
});
