import type { CleanerTask } from '@/types/cleaner';
import { date, duration } from '@/lib/cleaner/format';
import { UiIcon, buttonVariants } from '@/components/shared/ui';
import { CustomerContact } from './CustomerContact';
import { PhotoCard } from './PhotoCard';
import { StageCard } from './StageCard';
import { cardClass, iconAccentClass, tagClass } from './data';

type Step = {
  label: string;
  value?: string;
  active: boolean;
  passed: boolean;
};

/** Tampilan tugas berjalan: sapaan, alamat, tahapan, dan foto. */
export function WorkingPanel({
  task,
  maps,
  customerWA,
  displayedTime,
  elapsed,
  steps,
  completed,
  busy,
  canShare,
  sharing,
  endpoint,
  fileInput,
  onArrive,
  onShare,
  onUpload,
  onRemove,
}: {
  task: CleanerTask;
  maps: string;
  customerWA: string | null;
  displayedTime: string;
  elapsed: number;
  steps: Step[];
  completed: boolean;
  busy: string;
  canShare: boolean;
  sharing: boolean;
  endpoint: string;
  fileInput: React.RefObject<HTMLInputElement | null>;
  onArrive: () => void;
  onShare: () => void;
  onUpload: (file?: File) => void;
  onRemove: (photoId: string) => void;
}) {
  return (
    <>
      <section className={cardClass + ' flex items-start gap-10'}>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl leading-[1.5] tracking-[-0.025em] break-words text-ink">
            Tugas Anda
          </h1>
          <p className="mt-1 text-xs text-ink-muted">{task.staffName}</p>
          <span className={tagClass + ' mt-7'}>Order #{task.orderId}</span>
        </div>
        <div className="ml-auto text-right">
          <small className="block text-xs text-ink-muted">
            {task.startedAt || !task.departedAt
              ? 'Durasi Pengerjaan'
              : 'Durasi Perjalanan'}
          </small>
          <strong className="flex items-center gap-4 text-2xl leading-[1.5] font-bold tracking-[-0.04em] text-ink tabular-nums">
            {task.startedAt || task.departedAt ? (
              <>
                <UiIcon name="clock" className="size-[19px] text-accent" />
                {duration(elapsed)}
              </>
            ) : (
              'Belum tercatat'
            )}
          </strong>
          {task.stage === 'working' && task.estimatedCompletedAt && (
            <small className="block text-xs text-ink-muted">
              Perkiraan selesai{' '}
              {new Date(task.estimatedCompletedAt).toLocaleTimeString('id-ID', {
                timeZone: 'Asia/Jakarta',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              WIB · sesuai durasi layanan
            </small>
          )}
        </div>
      </section>

      <section className={cardClass}>
        <CustomerContact task={task} href={customerWA} />
        <div className="mt-14 flex items-start justify-between gap-12 border-t border-line pt-12">
          <p className="flex items-start gap-6 text-sm text-ink">
            <UiIcon name="pin" className={iconAccentClass + ' mt-3'} />
            {task.address}
          </p>
          <a
            className={buttonVariants({
              size: 'sm',
              className: 'shrink-0 whitespace-nowrap',
            })}
            href={maps}
            target="_blank"
            rel="noopener noreferrer"
          >
            Buka Maps
          </a>
        </div>
        <p className="mt-10 text-xs text-ink-muted">
          {task.service} · {date(task.date)} · {displayedTime}
        </p>
        {task.notes && (
          <aside className="mt-14 flex items-start gap-8 rounded-md bg-warning-soft p-12">
            <UiIcon name="paw" className="mt-3 size-[15px] text-warning" />
            <p className="text-xs leading-[1.7] text-ink-muted">{task.notes}</p>
          </aside>
        )}
      </section>

      <div className="flex items-center gap-8 rounded-card border border-line bg-surface px-15 py-13 text-xs text-ink">
        <UiIcon name="shield" className={iconAccentClass} />
        <span>Status tugas tersimpan</span>
        <small className="ml-auto text-xs text-ink-muted">
          Diperbarui tiap 5 detik
        </small>
      </div>

      <StageCard
        task={task}
        steps={steps}
        completed={completed}
        busy={busy}
        canShare={canShare}
        sharing={sharing}
        onArrive={onArrive}
        onShare={onShare}
      />
      <PhotoCard
        task={task}
        completed={completed}
        busy={busy}
        endpoint={endpoint}
        fileInput={fileInput}
        onUpload={onUpload}
        onRemove={onRemove}
      />
    </>
  );
}
