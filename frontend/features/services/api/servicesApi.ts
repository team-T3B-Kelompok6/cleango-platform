import 'server-only';
import { detail, list } from '@/lib/api';
import type { Service } from '@/types';

/**
 * Baca layanan. `list`/`detail` menormalkan envelope `{ data: … }` dan menolak
 * bentuk yang tidak sesuai sebelum sampai ke komponen.
 */
export async function getServices(): Promise<Service[]> {
  return list<Service>('services');
}

export async function getService(id: string): Promise<Service> {
  return detail<Service>('services', id);
}
