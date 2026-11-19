import { getCleanerTask } from '@/lib/cleaner/service';
import { TaskError } from '@/lib/cleaner/errors';
import { CleanerPortal } from '../components/CleanerPortal';
import { TaskUnavailable } from '../components/TaskUnavailable';

/**
 * Halaman tugas petugas. Akses memakai token tautan, bukan sesi admin; data
 * awal dibaca di server lalu polling/aksi ditangani `CleanerPortal`.
 */
export async function CleanerPage({
  token,
  embedded = false,
}: {
  token: string;
  embedded?: boolean;
}) {
  try {
    const task = await getCleanerTask(token);
    return <CleanerPortal initial={task} token={token} embedded={embedded} />;
  } catch (error) {
    if (!(error instanceof TaskError)) throw error;
    return <TaskUnavailable message={error.message} />;
  }
}
