import type { Metadata } from 'next';
import { ResourceListPage } from '@/components/ResourcePages';
import { StaffDetailServer } from '@/components/StaffDetailServer';
import { detailReturn } from '@/lib/detail-return';
import { detail } from '@/lib/api';
import { resources, valueText } from '@/lib/resources';
import type { Search, Staff } from '@/types';
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
  const record = await detail<Staff>('staff', id);
  const search = await searchParams;
  const returnTo = detailReturn('staff', search);
  return (
    <>
      <ResourceListPage
        resource="staff"
        search={{
          ...returnTo.search,
          ...(search.saved === '1' ? { saved: '1' } : {}),
        }}
      />
      <StaffDetailServer staff={record} closeHref={returnTo.href} />
    </>
  );
}
