import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../lib/db.js';
import { writeAudit } from './audit.model.js';

export interface Schedule {
  id: string;
  date: string;
  time: string;
  staff: string;
  status: string;
  address?: string;
  customer?: string;
  service?: string;
}

interface ScheduleRow extends RowDataPacket {
  id: number;
  cleanerId: number;
  staffName: string;
  scheduleDate: Date;
  startTime: string;
  endTime: string;
  status: string;
}

const SELECT = `SELECT ss.id, ss.cleaner_id AS cleanerId, c.name AS staffName,
  ss.schedule_date AS scheduleDate, ss.start_time AS startTime, ss.end_time AS endTime, ss.status
  FROM staff_shifts ss JOIN cleaners c ON c.id = ss.cleaner_id`;

export async function listSchedules(): Promise<Schedule[]> {
  const [rows] = await pool.query<ScheduleRow[]>(`${SELECT} ORDER BY ss.schedule_date DESC, ss.start_time ASC, ss.id DESC`);
  return rows.map(mapSchedule);
}

export async function findSchedule(id: number): Promise<Schedule | null> {
  const [rows] = await pool.query<ScheduleRow[]>(`${SELECT} WHERE ss.id = ? LIMIT 1`, [id]);
  return rows[0] ? mapSchedule(rows[0]) : null;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatTimeRange(start: string, end: string): string {
  const s = start.slice(0, 5);
  const e = end.slice(0, 5);
  const [sh = 0, sm = 0] = s.split(':').map(Number);
  const [eh = 0, em = 0] = e.split(':').map(Number);
  return `${pad(sh)}.${pad(sm)}–${pad(eh)}.${pad(em)} WIB`;
}

function mapSchedule(row: ScheduleRow): Schedule {
  return {
    id: String(row.id),
    date: row.scheduleDate.toISOString().slice(0, 10),
    time: formatTimeRange(row.startTime, row.endTime),
    staff: row.staffName,
    status: row.status,
  };
}

function parseTimeRange(value: string): { start: string; end: string } | null {
  const match = /^(\d{1,2})[:.](\d{2})\s*[–—-]\s*(\d{1,2})[:.](\d{2})(?:\s*WIB)?$/i.exec(value.trim());
  if (!match) return null;
  const [, sh, sm, eh, em] = match;
  const startHour = Number(sh);
  const startMinute = Number(sm);
  const endHour = Number(eh);
  const endMinute = Number(em);
  if (!Number.isInteger(startHour) || startHour < 0 || startHour > 23) return null;
  if (!Number.isInteger(startMinute) || startMinute < 0 || startMinute > 59) return null;
  if (!Number.isInteger(endHour) || endHour < 0 || endHour > 23) return null;
  if (!Number.isInteger(endMinute) || endMinute < 0 || endMinute > 59) return null;
  const start = `${String(startHour).padStart(2, '0')}:${sm}:00`;
  const end = `${String(endHour).padStart(2, '0')}:${em}:00`;
  if (start >= end) return null;
  return { start, end };
}

async function lockCleaner(connection: PoolConnection, cleanerId: number): Promise<void> {
  const [rows] = await connection.query<RowDataPacket[]>('SELECT id FROM cleaners WHERE id = ? FOR UPDATE', [cleanerId]);
  if (!rows[0]) throw new Error('STAFF_NOT_FOUND');
}

async function readSchedule(connection: PoolConnection, id: number): Promise<Schedule | null> {
  const [rows] = await connection.query<ScheduleRow[]>(`${SELECT} WHERE ss.id = ? LIMIT 1`, [id]);
  return rows[0] ? mapSchedule(rows[0]) : null;
}

async function assertNoOverlap(
  connection: PoolConnection,
  cleanerId: number,
  date: string,
  start: string,
  end: string,
  excludeId?: number,
): Promise<void> {
  const params: (string | number)[] = [cleanerId, date, end, start];
  let exclude = '';
  if (excludeId !== undefined) {
    exclude = ' AND id <> ?';
    params.push(excludeId);
  }
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT id FROM staff_shifts
     WHERE cleaner_id = ? AND schedule_date = ? AND status <> 'Nonaktif'
       AND start_time < ? AND end_time > ?${exclude}
     LIMIT 1 FOR UPDATE`,
    params,
  );
  if (rows[0]) throw new Error('SHIFT_CONFLICT');
}

export async function insertSchedule(
  input: {
    date: string;
    time: string;
    staff: string;
    status: string;
  },
  actor?: number | null,
): Promise<Schedule> {
  const parsed = parseTimeRange(input.time);
  if (!parsed) throw new Error('INVALID_TIME');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [cleaners] = await connection.query<RowDataPacket[]>('SELECT id FROM cleaners WHERE name = ? LIMIT 1 FOR UPDATE', [input.staff]);
    if (!cleaners[0]) throw new Error('STAFF_NOT_FOUND');
    const cleanerId = Number(cleaners[0].id);
    if (input.status !== 'Nonaktif') await assertNoOverlap(connection, cleanerId, input.date, parsed.start, parsed.end);
    const [result] = await connection.execute<ResultSetHeader>(
      'INSERT INTO staff_shifts (cleaner_id, schedule_date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)',
      [cleanerId, input.date, parsed.start, parsed.end, input.status],
    );
    const schedule = await readSchedule(connection, result.insertId);
    if (!schedule) throw new Error('Jadwal gagal dibaca setelah dibuat');
    if (actor != null) {
      await writeAudit(connection, {
        adminId: actor,
        action: 'create',
        entityType: 'schedules',
        entityId: result.insertId,
        before: null,
        after: { ...schedule },
        summary: 'Buat jadwal baru',
      });
    }
    await connection.commit();
    return schedule;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

interface ShiftState extends RowDataPacket {
  cleanerId: number;
  scheduleDate: Date;
  startTime: string;
  endTime: string;
  status: string;
}

export async function updateScheduleById(
  id: number,
  input: { date?: string; time?: string; staff?: string; status?: string },
  actor?: number | null,
): Promise<Schedule | null> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [initialRows] = await connection.query<ShiftState[]>(
      'SELECT cleaner_id AS cleanerId, schedule_date AS scheduleDate, start_time AS startTime, end_time AS endTime, status FROM staff_shifts WHERE id = ? LIMIT 1',
      [id],
    );
    const initial = initialRows[0];
    if (!initial) {
      await connection.rollback();
      return null;
    }
    const initialCleanerId = Number(initial.cleanerId);

    let requestedCleanerId = initialCleanerId;
    if (input.staff !== undefined) {
      const [cleaners] = await connection.query<RowDataPacket[]>('SELECT id FROM cleaners WHERE name = ? LIMIT 1', [input.staff]);
      if (!cleaners[0]) throw new Error('STAFF_NOT_FOUND');
      requestedCleanerId = Number(cleaners[0].id);
    }

    const cleanerIds = [...new Set([initialCleanerId, requestedCleanerId])].sort((a, b) => a - b);
    for (const cleanerId of cleanerIds) await lockCleaner(connection, cleanerId);

    const [currentRows] = await connection.query<ShiftState[]>(
      'SELECT cleaner_id AS cleanerId, schedule_date AS scheduleDate, start_time AS startTime, end_time AS endTime, status FROM staff_shifts WHERE id = ? LIMIT 1 FOR UPDATE',
      [id],
    );
    const current = currentRows[0];
    if (!current) {
      await connection.rollback();
      return null;
    }
    if (Number(current.cleanerId) !== initialCleanerId) {
      throw new Error('SHIFT_CONFLICT');
    }

    const before = await readSchedule(connection, id);

    let cleanerId = Number(current.cleanerId);
    const date = input.date ?? current.scheduleDate.toISOString().slice(0, 10);
    let start = String(current.startTime);
    let end = String(current.endTime);
    const status = input.status ?? current.status;
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    if (input.date !== undefined) { fields.push('schedule_date = ?'); values.push(input.date); }
    if (input.time !== undefined) {
      const parsed = parseTimeRange(input.time);
      if (!parsed) throw new Error('INVALID_TIME');
      start = parsed.start;
      end = parsed.end;
      fields.push('start_time = ?', 'end_time = ?');
      values.push(parsed.start, parsed.end);
    }
    if (input.staff !== undefined) {
      cleanerId = requestedCleanerId;
      fields.push('cleaner_id = ?');
      values.push(cleanerId);
    }
    if (input.status !== undefined) { fields.push('status = ?'); values.push(input.status); }
    if (fields.length && status !== 'Nonaktif') await assertNoOverlap(connection, cleanerId, date, start, end, id);
    if (fields.length) {
      values.push(id);
      await connection.execute(`UPDATE staff_shifts SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    const schedule = await readSchedule(connection, id);
    const changed = fields.length > 0 && before != null && schedule != null && JSON.stringify(before) !== JSON.stringify(schedule);
    if (changed && actor != null && before != null && schedule != null) {
      await writeAudit(connection, {
        adminId: actor,
        action: 'update',
        entityType: 'schedules',
        entityId: id,
        before: { ...before },
        after: { ...schedule },
        summary: 'Perbarui jadwal pelayanan',
      });
    }
    await connection.commit();
    return schedule;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteScheduleById(id: number, actor?: number | null): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [shiftRows] = await connection.query<RowDataPacket[]>(
      'SELECT cleaner_id AS cleanerId FROM staff_shifts WHERE id = ? LIMIT 1',
      [id],
    );
    const shiftRow = shiftRows[0];
    if (!shiftRow) {
      await connection.rollback();
      return false;
    }
    const cleanerId = Number(shiftRow.cleanerId);
    await lockCleaner(connection, cleanerId);
    const [lockRows] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM staff_shifts WHERE id = ? FOR UPDATE',
      [id],
    );
    if (!lockRows[0]) {
      await connection.rollback();
      return false;
    }
    const before = await readSchedule(connection, id);
    await connection.execute<ResultSetHeader>('DELETE FROM staff_shifts WHERE id = ?', [id]);
    if (actor != null && before != null) {
      await writeAudit(connection, {
        adminId: actor,
        action: 'delete',
        entityType: 'schedules',
        entityId: id,
        before: { ...before },
        after: null,
        summary: 'Hapus jadwal',
      });
    }
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
