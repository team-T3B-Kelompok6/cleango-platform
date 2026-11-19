import 'server-only';
import { detail, list } from '@/lib/api';
import type { Customer } from '@/types';

/** Statistik customer (jumlah pesanan, total belanja) dihitung di `lib/customers`. */
export async function getCustomers(): Promise<Customer[]> {
  return list<Customer>('customers');
}

export async function getCustomer(id: string): Promise<Customer> {
  return detail<Customer>('customers', id);
}
