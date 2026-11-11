import { beforeEach, describe, expect, it, vi } from 'vitest';
import { writeAudit } from '../src/model/audit.model.js';
import * as scheduleModel from '../src/model/schedule.model.js';
import {
  createSchedule,
  deleteSchedule,
  updateSchedule,
} from '../src/controller/schedule.controller.js';
import {
  deleteScheduleById,
  insertSchedule,
  updateScheduleById,
} from '../src/model/schedule.model.js';

const { connection, pool } = vi.hoisted(() => {
  const connection = {
    beginTransaction: vi.fn(async () => {}),
    commit: vi.fn(async () => {}),
    rollback: vi.fn(async () => {}),
    release: vi.fn(() => {}),
    query: vi.fn(),
    execute: vi.fn(),
  };
  const pool = { getConnection: vi.fn(async () => connection) };
  return { connection, pool };
});

vi.mock('../src/lib/db.js', () => ({ pool }));
vi.mock('../src/model/audit.model.js', () => ({ writeAudit: vi.fn() }));

const staffName = 'Petugas Uji';
const date = '2099-01-15';

let cleaners: Array<{ id: number; name: string }> = [];
let shifts: Array<{
  id: number;
  cleanerId: number;
  date: string;
  start: string;
  end: string;
  status: string;
}> = [];
let nextShiftId = 1;

function resetState(): void {
  cleaners = [{ id: 1, name: staffName }];
  shifts = [];
  nextShiftId = 1;
  connection.query.mockReset();
  connection.execute.mockReset();
  connection.beginTransaction.mockClear();
  connection.commit.mockClear();
  connection.rollback.mockClear();
  connection.release.mockClear();
  writeAudit.mockReset();

  connection.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
    const text = String(sql);
    if (text.includes('FROM cleaners WHERE name = ?')) {
      const row = cleaners.find((cleaner) => cleaner.name === params[0]);
      return [row ? [{ id: row.id }] : []];
    }
    if (text.includes('FROM cleaners WHERE id = ? FOR UPDATE')) {
      const row = cleaners.find((cleaner) => cleaner.id === Number(params[0]));
      return [row ? [{ id: row.id }] : []];
    }
    if (
      text.includes('FROM staff_shifts') &&
      text.includes('cleaner_id = ?') &&
      text.includes('schedule_date = ?')
    ) {
      const cleanerId = Number(params[0]);
      const targetDate = params[1];
      const newEnd = params[2];
      const newStart = params[3];
      const excludeId = params[4];
      const found = shifts.find((shift) =>
        shift.cleanerId === cleanerId &&
        shift.date === targetDate &&
        shift.status !== 'Nonaktif' &&
        (excludeId === undefined || shift.id !== Number(excludeId)) &&
        shift.start < String(newEnd) &&
        shift.end > String(newStart),
      );
      return [found ? [{ id: found.id }] : []];
    }
    if (text.includes('JOIN cleaners')) {
      const id = Number(params[0]);
      const shift = shifts.find((s) => s.id === id);
      if (!shift) return [[]];
      const cleaner = cleaners.find((c) => c.id === shift.cleanerId);
      return [[{
        id: shift.id,
        cleanerId: shift.cleanerId,
        staffName: cleaner?.name ?? '',
        scheduleDate: new Date(`${shift.date}T00:00:00.000Z`),
        startTime: shift.start,
        endTime: shift.end,
        status: shift.status,
      }]];
    }
    if (text.includes('WHERE id = ?') && text.includes('FOR UPDATE')) {
      const id = Number(params[0]);
      const shift = shifts.find((s) => s.id === id);
      return [shift
        ? [{ cleanerId: shift.cleanerId, scheduleDate: new Date(`${shift.date}T00:00:00.000Z`), startTime: shift.start, endTime: shift.end, status: shift.status }]
        : []];
    }
    if (text.includes('WHERE id = ?') && text.includes('schedule_date AS scheduleDate')) {
      const id = Number(params[0]);
      const shift = shifts.find((s) => s.id === id);
      return [shift
        ? [{ cleanerId: shift.cleanerId, scheduleDate: new Date(`${shift.date}T00:00:00.000Z`), startTime: shift.start, endTime: shift.end, status: shift.status }]
        : []];
    }
    if (text.includes('WHERE id = ?')) {
      const id = Number(params[0]);
      const shift = shifts.find((s) => s.id === id);
      return [shift ? [{ cleanerId: shift.cleanerId }] : []];
    }
    return [[]];
  });

  connection.execute.mockImplementation(async (sql: string, params: unknown[] = []) => {
    const text = String(sql);
    if (text.startsWith('INSERT INTO staff_shifts')) {
      const id = nextShiftId++;
      shifts.push({
        id,
        cleanerId: Number(params[0]),
        date: String(params[1]),
        start: String(params[2]),
        end: String(params[3]),
        status: String(params[4]),
      });
      return [{ insertId: id, affectedRows: 1 }];
    }
    if (text.startsWith('UPDATE staff_shifts')) {
      const id = Number(params[params.length - 1]);
      const shift = shifts.find((s) => s.id === id);
      if (shift) {
        const setPart = text.match(/SET (.*) WHERE/)?.[1] ?? '';
        const fields = setPart.split(',').map((field) => field.trim());
        let index = 0;
        for (const field of fields) {
          if (field === 'schedule_date = ?') shift.date = String(params[index++]);
          else if (field === 'start_time = ?') shift.start = String(params[index++]);
          else if (field === 'end_time = ?') shift.end = String(params[index++]);
          else if (field === 'status = ?') shift.status = String(params[index++]);
          else if (field === 'cleaner_id = ?') shift.cleanerId = Number(params[index++]);
          else index++;
        }
      }
      return [{ affectedRows: shift ? 1 : 0 }];
    }
    if (text.startsWith('DELETE FROM staff_shifts')) {
      const id = Number(params[0]);
      const index = shifts.findIndex((s) => s.id === id);
      if (index >= 0) shifts.splice(index, 1);
      return [{ affectedRows: index >= 0 ? 1 : 0 }];
    }
    return [{ insertId: 1, affectedRows: 1 }];
  });
}

beforeEach(() => {
  resetState();
});

function auditEntry(): Record<string, unknown> | null {
  const calls = writeAudit.mock.calls;
  if (calls.length === 0) return null;
  return calls[calls.length - 1][1] as Record<string, unknown>;
}

describe('model schedule audit', () => {
  it('create mencatat audit dalam transaksi yang sama dengan actor nyata', async () => {
    const data = await insertSchedule(
      { date, staff: staffName, status: 'Terjadwal', time: '08.00–10.00 WIB' },
      7,
    );
    expect(data.id).toBe('1');
    expect(connection.beginTransaction).toHaveBeenCalled();
    expect(connection.commit).toHaveBeenCalled();
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(writeAudit).toHaveBeenCalledTimes(1);
    expect(writeAudit.mock.calls[0][0]).toBe(connection);
    const entry = auditEntry()!;
    expect(entry).toMatchObject({
      adminId: 7,
      action: 'create',
      entityType: 'schedules',
      entityId: 1,
      before: null,
      summary: 'Buat jadwal baru',
    });
    expect(entry.after).toMatchObject({
      date,
      time: '08.00–10.00 WIB',
      staff: staffName,
      status: 'Terjadwal',
    });
  });

  it('update mencatat before dan after dari database dengan actor', async () => {
    const created = await insertSchedule(
      { date, staff: staffName, status: 'Terjadwal', time: '08.00–10.00 WIB' },
      7,
    );
    writeAudit.mockClear();
    const updated = await updateScheduleById(Number(created.id), { status: 'Selesai' }, 7);
    expect(updated?.status).toBe('Selesai');
    expect(connection.commit).toHaveBeenCalled();
    expect(writeAudit).toHaveBeenCalledTimes(1);
    const entry = auditEntry()!;
    expect(entry).toMatchObject({
      adminId: 7,
      action: 'update',
      entityType: 'schedules',
      entityId: Number(created.id),
    });
    expect(entry.before).toMatchObject({ status: 'Terjadwal' });
    expect(entry.after).toMatchObject({ status: 'Selesai' });
    expect(String(entry.summary)).toContain('jadwal');
  });

  it('update tanpa perubahan tidak mencatat audit palsu', async () => {
    const created = await insertSchedule(
      { date, staff: staffName, status: 'Terjadwal', time: '08.00–10.00 WIB' },
      7,
    );
    writeAudit.mockClear();
    await updateScheduleById(
      Number(created.id),
      { date, staff: staffName, status: 'Terjadwal', time: '08.00–10.00 WIB' },
      7,
    );
    expect(writeAudit).not.toHaveBeenCalled();
    expect(connection.commit).toHaveBeenCalled();
  });

  it('gagal audit memaksa rollback dan tidak commit', async () => {
    writeAudit.mockRejectedValueOnce(new Error('Aksi audit tidak dikenal'));
    await expect(
      insertSchedule({ date, staff: staffName, status: 'Terjadwal', time: '08.00–10.00 WIB' }, 7),
    ).rejects.toThrow('Aksi audit tidak dikenal');
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it('konflik shift tidak mencatat audit', async () => {
    await insertSchedule(
      { date, staff: staffName, status: 'Terjadwal', time: '08.00–10.00 WIB' },
      7,
    );
    writeAudit.mockClear();
    await expect(
      insertSchedule({ date, staff: staffName, status: 'Terjadwal', time: '09.00–11.00 WIB' }, 7),
    ).rejects.toThrow('SHIFT_CONFLICT');
    expect(writeAudit).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalled();
  });

  it('delete membaca before, menghapus, dan mencatat audit dalam transaksi', async () => {
    const created = await insertSchedule(
      { date, staff: staffName, status: 'Terjadwal', time: '08.00–10.00 WIB' },
      7,
    );
    writeAudit.mockClear();
    const ok = await deleteScheduleById(Number(created.id), 7);
    expect(ok).toBe(true);
    expect(connection.beginTransaction).toHaveBeenCalled();
    expect(connection.commit).toHaveBeenCalled();
    expect(writeAudit).toHaveBeenCalledTimes(1);
    const entry = auditEntry()!;
    expect(entry).toMatchObject({
      adminId: 7,
      action: 'delete',
      entityType: 'schedules',
      entityId: Number(created.id),
      after: null,
    });
    expect(entry.before).toMatchObject({ id: created.id, status: 'Terjadwal' });
    const lockSql = connection.query.mock.calls
      .map((call) => String(call[0]))
      .filter((statement) => statement.includes('FOR UPDATE'));
    const cleanerLock = lockSql.find((statement) => statement.includes('FROM cleaners'));
    const shiftLock = lockSql.find((statement) => statement.includes('FROM staff_shifts'));
    expect(cleanerLock).toBeTruthy();
    expect(shiftLock).toBeTruthy();
    expect(lockSql.indexOf(cleanerLock!)).toBeLessThan(lockSql.indexOf(shiftLock!));
  });

  it('jadwal tidak ditemukan tidak mencatat audit', async () => {
    const ok = await deleteScheduleById(999, 7);
    expect(ok).toBe(false);
    expect(writeAudit).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalled();
  });
});

describe('controller schedule', () => {
  const response = (): any => {
    const instance = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    instance.status.mockReturnThis();
    return instance;
  };

  it('createSchedule meneruskan actor dari request.user.id, bukan body', async () => {
    const request = {
      body: { date, time: '08.00–10.00 WIB', staff: staffName, status: 'Terjadwal', adminId: 999 },
      user: { id: 11 },
    } as any;
    const res = response();
    const next = vi.fn();
    await createSchedule(request, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(writeAudit).toHaveBeenCalledTimes(1);
    expect((auditEntry() as Record<string, unknown>).adminId).toBe(11);
  });

  it('updateSchedule meneruskan actor dari request.user.id', async () => {
    const created = await insertSchedule(
      { date, staff: staffName, status: 'Terjadwal', time: '08.00–10.00 WIB' },
      11,
    );
    writeAudit.mockClear();
    const request = {
      params: { id: created.id },
      body: { status: 'Selesai', adminId: 999 },
      user: { id: 12 },
    } as any;
    const res = response();
    const next = vi.fn();
    await updateSchedule(request, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    const entry = auditEntry() as Record<string, unknown>;
    expect(entry.adminId).toBe(12);
    expect(entry.action).toBe('update');
  });

  it('deleteSchedule meneruskan actor dari request.user.id', async () => {
    const created = await insertSchedule(
      { date, staff: staffName, status: 'Terjadwal', time: '08.00–10.00 WIB' },
      11,
    );
    writeAudit.mockClear();
    const request = {
      params: { id: created.id },
      body: {},
      user: { id: 13 },
    } as any;
    const res = response();
    const next = vi.fn();
    await deleteSchedule(request, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    const entry = auditEntry() as Record<string, unknown>;
    expect(entry.adminId).toBe(13);
    expect(entry.action).toBe('delete');
  });

  it('jadwal tidak ditemukan: 404 dan tidak ada audit', async () => {
    const request = { params: { id: '999' }, body: {}, user: { id: 11 } } as any;
    const res = response();
    const next = vi.fn();
    await deleteSchedule(request, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0] as { statusCode?: number };
    expect(error.statusCode).toBe(404);
    expect(writeAudit).not.toHaveBeenCalled();
  });
});