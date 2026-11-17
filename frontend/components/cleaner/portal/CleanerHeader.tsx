import { CleanGoLogo } from '@/components/shared/ui/CleanGoLogo';
import { tagClass } from './data';

/** Baris identitas portal petugas. */
export function CleanerHeader({
  assigned,
  completed,
}: {
  assigned: boolean;
  completed: boolean;
}) {
  return (
    <header className="sticky top-0 z-10 flex min-h-64 items-center justify-between gap-10 border-b border-line bg-surface px-18 py-12">
      <div className="flex min-w-0 items-center gap-8">
        <CleanGoLogo size={30} />
        <strong className="text-xl font-bold tracking-[-0.04em] text-accent">
          CleanGo
        </strong>
        <span className={tagClass}>
          {assigned ? 'WhatsApp Link' : 'Field Portal'}
        </span>
      </div>
      <span className="inline-flex items-center gap-5 text-xs whitespace-nowrap text-accent">
        <i className="size-[6px] shrink-0 rounded-full bg-current" />
        {completed ? 'Tugas Selesai' : 'Sesi Aktif'}
      </span>
    </header>
  );
}
