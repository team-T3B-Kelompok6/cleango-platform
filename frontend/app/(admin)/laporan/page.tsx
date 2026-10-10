import type { Metadata } from 'next';
import type { Search } from '@/types';
import { ReportView } from '@/components/ReportView';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Laporan Keuangan & Operasional' };
export default async function Reports({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return <ReportView params={await searchParams} />;
}
