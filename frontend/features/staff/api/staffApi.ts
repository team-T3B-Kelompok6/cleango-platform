import 'server-only';
import { detail, list } from '@/lib/api';
import type { Staff } from '@/types';

/**
 * Baca petugas. Perhitungan status operasional dan kandidat penugasan tetap di
 * `lib/staff.ts` karena dipakai lintas fitur (pesanan, jadwal, tracking).
 */
export async function getStaff(): Promise<Staff[]> {
  return list<Staff>('staff');
}

export async function getStaffMember(id: string): Promise<Staff> {
  return detail<Staff>('staff', id);
}
