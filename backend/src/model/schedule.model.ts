import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';

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
  const start = `${String(sh).padStart(2, '0')}:${sm}:00`;
  const end = `${String(eh).padStart(2, '0')}:${em}:00`;
  return { start, end };
}

export async function insertSchedule(input: {
  date: string;
  time: string;
  staff: string;
  status: string;
}): Promise<Schedule> {
  const parsed = parseTimeRange(input.time);
  if (!parsed) throw new Error('INVALID_TIME');
  const [cleaners] = await pool.query<RowDataPacket[]>('SELECT id FROM cleaners WHERE name = ? LIMIT 1', [input.staff]);
  if (!cleaners[0]) throw new Error('STAFF_NOT_FOUND');
  const cleanerId = Number(cleaners[0].id);
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO staff_shifts (cleaner_id, schedule_date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)',
    [cleanerId, input.date, parsed.start, parsed.end, input.status],
  );
  const schedule = await findSchedule(result.insertId);
  if (!schedule) throw new Error('Jadwal gagal dibaca setelah dibuat');
  return schedule;
}

export async function updateScheduleById(
  id: number,
  input: { date?: string; time?: string; staff?: string; status?: string },
): Promise<Schedule | null> {
  const existing = await findSchedule(id);
  if (!existing) return null;
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (input.date !== undefined) { fields.push('schedule_date = ?'); values.push(input.date); }
  if (input.time !== undefined) {
    const parsed = parseTimeRange(input.time);
    if (!parsed) throw new Error('INVALID_TIME');
    fields.push('start_time = ?', 'end_time = ?');
    values.push(parsed.start, parsed.end);
  }
  if (input.staff !== undefined) {
    const [cleaners] = await pool.query<RowDataPacket[]>('SELECT id FROM cleaners WHERE name = ? LIMIT 1', [input.staff]);
    if (!cleaners[0]) throw new Error('STAFF_NOT_FOUND');
    fields.push('cleaner_id = ?');
    values.push(Number(cleaners[0].id));
  }
  if (input.status !== undefined) { fields.push('status = ?'); values.push(input.status); }
  if (!fields.length) return existing;
  values.push(id);
  await pool.execute(`UPDATE staff_shifts SET ${fields.join(', ')} WHERE id = ?`, values);
  return findSchedule(id);
}

export async function deleteScheduleById(id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>('DELETE FROM staff_shifts WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
