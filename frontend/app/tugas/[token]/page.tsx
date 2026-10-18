import type { Metadata } from 'next';
import { CleanerPortal } from '@/components/cleaner/CleanerPortal';
import { getCleanerTask } from '@/lib/cleaner/service';
import { TaskError } from '@/lib/cleaner/errors';
import { CleanGoLogo } from '@/components/CleanGoLogo';
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
  try {
    const task = await getCleanerTask(token);
    return (
      <CleanerPortal
        initial={task}
        token={token}
        embedded={(await searchParams).embed === '1'}
      />
    );
  } catch (error) {
    if (!(error instanceof TaskError)) throw error;
    return (
      <main className="cleaner-invalid">
        <CleanGoLogo />
        <h1>Link tugas tidak tersedia</h1>
        <p>{error.message}</p>
        <p>
          Minta link terbaru kepada admin CleanGo. Link hanya berlaku untuk
          petugas dan tugas yang ditentukan.
        </p>
      </main>
    );
  }
}
