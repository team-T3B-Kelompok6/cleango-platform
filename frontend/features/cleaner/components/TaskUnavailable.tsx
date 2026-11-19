import { CleanGoLogo } from '@/components/ui/CleanGoLogo';

/** Tampilan saat tautan tugas tidak valid, kedaluwarsa, atau sudah dipakai. */
export function TaskUnavailable({ message }: { message: string }) {
  return (
    <main className="mx-auto my-[8vh] max-w-460 rounded-dialog border border-line bg-surface p-30 text-center">
      <CleanGoLogo />
      <h1 className="mt-12 mb-3 text-2xl leading-[1.5] text-ink">
        Link tugas tidak tersedia
      </h1>
      <p className="mb-3 text-md leading-[1.8] text-ink-muted">{message}</p>
      <p className="mb-3 text-md leading-[1.8] text-ink-muted">
        Minta link terbaru kepada admin CleanGo. Link hanya berlaku untuk
        petugas dan tugas yang ditentukan.
      </p>
    </main>
  );
}
