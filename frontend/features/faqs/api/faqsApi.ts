import 'server-only';
import { detail, list } from '@/lib/api';
import type { Faq } from '@/types';

/** Baca FAQ publik yang dikelola admin. */
export async function getFaqs(): Promise<Faq[]> {
  return list<Faq>('faqs');
}

export async function getFaq(id: string): Promise<Faq> {
  return detail<Faq>('faqs', id);
}
