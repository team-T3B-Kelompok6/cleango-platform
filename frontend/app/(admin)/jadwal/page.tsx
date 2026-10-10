import type { Metadata } from 'next';
import { ResourceListPage } from '@/components/ResourcePages';
import { resources } from '@/lib/resources';
import type { Search } from '@/types';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: resources.schedules.title };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return <ResourceListPage resource="schedules" search={await searchParams} />;
}
