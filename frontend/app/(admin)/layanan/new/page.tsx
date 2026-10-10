import type { Metadata } from 'next';
import { ResourceNewPage } from '@/components/ResourcePages';
import { resources } from '@/lib/resources';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Tambah ' + resources.services.singular,
};
export default async function Page() {
  return <ResourceNewPage resource="services" />;
}
