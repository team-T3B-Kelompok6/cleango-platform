import type { Metadata } from 'next';
import { CleanerPage } from '@/features/cleaner';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { absolute: 'Tugas Petugas | CleanGo' },
  description:
    'Halaman tugas khusus petugas CleanGo. Akses hanya untuk penugasan terkait.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { token } = await params;
  return (
    <CleanerPage token={token} embedded={(await searchParams).embed === '1'} />
  );
}
