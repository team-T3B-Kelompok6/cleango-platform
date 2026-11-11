import { beforeEach, describe, expect, it, vi } from 'vitest';
import { insertSchedule, updateScheduleById } from '../src/model/schedule.model.js';

const { connection, pool } = vi.hoisted(() => {
  const connection = {
    beginTransaction: vi.fn(async () => {}),
    commit: vi.fn(async () => {}),
    rollback: vi.fn(async () => {}),
    release: vi.fn(() => {}),
    query: vi.fn(),
    execute: vi.fn(),
  };
  const pool = {
    getConnection: vi.fn(async () => connection),
    query: vi.fn(async () => [[]]),
    execute: vi.fn(async () => [{ affectedRows: 0 }]),
  };
  return { connection, pool };
});

vi.mock('../src/lib/db.js', () => ({ pool }));

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

  connection.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
    const text = String(sql);
    if (text.includes('FROM cleaners WHERE id = ? FOR UPDATE')) {
      const id = Number(params[0]);
      const row = cleaners.find((cleaner) => cleaner.id === id);
      return [row ? [{ id: row.id }] : []];
    }
    if (text.includes('FROM cleaners WHERE name = ?')) {
      const name = params[0];
      const row = cleaners.find((cleaner) => cleaner.name === name);
      return [row ? [{ id: row.id }] : []];
    }
    if (text.includes('FROM staff_shifts') && text.includes('cleaner_id = ?') && text.includes('schedule_date = ?')) {
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
    if (text.includes('FROM staff_shifts') && (text.includes('WHERE id = ?') || text.includes('WHERE ss.id = ?'))) {
      const id = Number(params[0]);
      const shift = shifts.find((item) => item.id === id);
      if (!shift) return [[]];
      const cleaner = cleaners.find((item) => item.id === shift.cleanerId);
      if (text.includes('JOIN cleaners')) {
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
      return [[{
        cleanerId: shift.cleanerId,
        scheduleDate: new Date(`${shift.date}T00:00:00.000Z`),
        startTime: shift.start,
        endTime: shift.end,
        status: shift.status,
      }]];
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
      const shift = shifts.find((item) => item.id === id);
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
    return [{ affectedRows: 0 }];
  });
}

beforeEach(() => {
  resetState();
});

describe('schedule conflict handling', () => {
  it('allows touching intervals', async () => {
    const first = await insertSchedule({ date, staff: staffName, status: 'Terjadwal', time: '08.00–10.00 WIB' });
    const second = await insertSchedule({ date, staff: staffName, status: 'Terjadwal', time: '10.00–12.00 WIB' });
    expect(second.id).toBeTruthy();
    expect(first.id).not.toBe(second.id);
  });

  it('rejects overlapping intervals', async () => {
    await insertSchedule({ date, staff: staffName, status: 'Terjadwal', time: '08.00–10.00 WIB' });
    await expect(insertSchedule({ date, staff: staffName, status: 'Terjadwal', time: '09.00–11.00 WIB' }))
      .rejects.toThrow('SHIFT_CONFLICT');
  });

  it('allows editing a shift to its own interval', async () => {
    const first = await insertSchedule({ date, staff: staffName, status: 'Terjadwal', time: '08.00–10.00 WIB' });
    const edited = await updateScheduleById(Number(first.id), { time: '08.00–10.00 WIB' });
    expect(edited?.id).toBe(first.id);
  });

  it('excludes inactive shifts from conflicts and handles reactivation', async () => {
    await insertSchedule({ date, staff: staffName, status: 'Terjadwal', time: '08.00–10.00 WIB' });
    const inactive = await insertSchedule({ date, staff: staffName, status: 'Nonaktif', time: '09.00–11.00 WIB' });
    await expect(updateScheduleById(Number(inactive.id), { status: 'Terjadwal' }))
      .rejects.toThrow('SHIFT_CONFLICT');
  });

  it('locks cleaner before shift rows', async () => {
    await insertSchedule({ date, staff: staffName, status: 'Terjadwal', time: '08.00–10.00 WIB' });
    const lockOrder = connection.query.mock.calls
      .map((call) => String(call[0]))
      .filter((sql) => sql.includes('FOR UPDATE'));
    expect(lockOrder.length).toBeGreaterThan(0);
    expect(lockOrder[0]).toContain('cleaners');
    expect(lockOrder.some((sql) => sql.includes('staff_shifts'))).toBe(true);
  });
});
