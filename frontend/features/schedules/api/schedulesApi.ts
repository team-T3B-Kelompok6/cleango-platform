import 'server-only';
import { detail, list } from '@/lib/api';
import type { Schedule } from '@/types';

/** Baca jadwal shift; normalisasi baris dilakukan di `scheduleRules`. */
export async function getSchedules(): Promise<Schedule[]> {
  return list<Schedule>('schedules');
}

export async function getSchedule(id: string): Promise<Schedule> {
  return detail<Schedule>('schedules', id);
}
