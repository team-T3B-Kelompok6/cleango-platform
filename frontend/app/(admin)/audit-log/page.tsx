import type { Metadata } from 'next';
import { AuditLogView } from '@/components/AuditLogView';
import type { Search } from '@/types';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Audit Log Admin' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return <AuditLogView search={await searchParams} />;
}
