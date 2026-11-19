import type { Metadata } from 'next';
import type { Search } from '@/types';
import { AuditPage } from '@/features/audit';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Audit Log Admin' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return <AuditPage search={await searchParams} />;
}
