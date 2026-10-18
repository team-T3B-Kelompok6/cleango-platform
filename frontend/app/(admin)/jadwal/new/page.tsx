import type { Metadata } from 'next';
import { ResourceNewPage } from '@/components/ResourcePages';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tambah Jadwal Petugas' };
export default async function Page() {
  return <ResourceNewPage resource="schedules" />;
}
