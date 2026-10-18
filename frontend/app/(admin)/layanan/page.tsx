import type { Metadata } from 'next';
import { ResourceListPage } from '@/components/ResourcePages';
import { resources } from '@/lib/resources';
import type { Search } from '@/types';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: resources.services.title };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  return <ResourceListPage resource="services" search={search} />;
}
