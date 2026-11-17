import type { Metadata } from 'next';
import { CleanerPortal } from '@/components/cleaner/CleanerPortal';
import { getCleanerTask } from '@/lib/cleaner/service';
import { TaskError } from '@/lib/cleaner/errors';
import { CleanGoLogo } from '@/components/shared/ui/CleanGoLogo';
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
      <main className="mx-auto my-[8vh] max-w-460 rounded-dialog border border-line bg-surface p-30 text-center">
        <CleanGoLogo />
        <h1 className="mt-12 mb-3 text-2xl leading-[1.5] text-ink">
          Link tugas tidak tersedia
        </h1>
        <p className="mb-3 text-md leading-[1.8] text-ink-muted">
          {error.message}
        </p>
        <p className="mb-3 text-md leading-[1.8] text-ink-muted">
          Minta link terbaru kepada admin CleanGo. Link hanya berlaku untuk
          petugas dan tugas yang ditentukan.
        </p>
      </main>
    );
  }
}
