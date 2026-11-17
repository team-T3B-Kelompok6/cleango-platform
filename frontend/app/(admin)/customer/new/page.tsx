import type { Metadata } from 'next';
import { ResourceNewPage } from '@/components/resource/ResourcePages';
import { resources } from '@/lib/resources';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Tambah ' + resources.customers.singular,
};
export default async function Page() {
  return <ResourceNewPage resource="customers" />;
}
