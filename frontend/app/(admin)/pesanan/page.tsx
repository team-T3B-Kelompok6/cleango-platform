import type { Metadata } from 'next';
import { ResourceListPage } from '@/components/ResourcePages';
import { resources } from '@/lib/resources';
import type { Search } from '@/types';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: resources.orders.title };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return <ResourceListPage resource="orders" search={await searchParams} />;
}
