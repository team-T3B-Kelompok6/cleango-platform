import type { Metadata } from 'next';
import { ResourceDetailPage } from '@/components/ResourcePages';
import { detail } from '@/lib/api';
import { resources, valueText } from '@/lib/resources';
import type { Search } from '@/types';
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const record = await detail('staff', id);
  return {
    title:
      resources.staff.singular +
      ' ' +
      valueText(record.name ?? record.customer ?? record.question ?? id),
  };
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const { id } = await params;
  return (
    <ResourceDetailPage
      resource="staff"
      id={id}
      saved={(await searchParams).saved === '1'}
    />
  );
}
