import type { CleanerTask } from '@/types/cleaner';
import { stageLabels } from '@/types/cleaner';
import { time } from '@/lib/cleaner/format';
import { Button, UiIcon } from '@/components/shared/ui';
import {
  cardClass,
  sectionHeadingClass,
  sectionMetaClass,
  sectionTitleClass,
} from './data';

type Step = {
  label: string;
  value?: string;
  active: boolean;
  passed: boolean;
};

/** Tahapan pengerjaan + aksi tiba dan berbagi lokasi. */
export function StageCard({
  task,
  steps,
  completed,
  busy,
  canShare,
  sharing,
  onArrive,
  onShare,
}: {
  task: CleanerTask;
  steps: Step[];
  completed: boolean;
  busy: string;
  canShare: boolean;
  sharing: boolean;
  onArrive: () => void;
  onShare: () => void;
}) {
  return (
    <section className={cardClass}>
      <div className={sectionHeadingClass}>
        <h2 className={sectionTitleClass}>Tahapan Pengerjaan</h2>
        <small className={sectionMetaClass}>{stageLabels[task.stage]}</small>
      </div>
      <ol className="m-0 grid list-none grid-cols-2 gap-10 p-0">
        {steps.map((step, index) => {
          const done = Boolean(
            step.value || step.passed || (completed && index === 3),
          );
          return (
            <li
              key={step.label}
              className={
                'flex items-center gap-8 rounded-md border p-11 ' +
                (step.active
                  ? 'border-line-strong bg-accent-soft'
                  : 'border-line bg-surface-soft')
              }
            >
              <span
                className={
                  'grid size-20 shrink-0 place-items-center rounded-full text-xs ' +
                  (done
                    ? 'bg-accent text-white'
                    : 'bg-surface-tint text-ink-muted')
                }
              >
                {done ? (
                  <UiIcon name="tick" className="size-[14px]" />
                ) : (
                  index + 1
                )}
              </span>
              <div>
                <strong className="block text-xs leading-[1.6] text-ink">
                  {index + 1}. {step.label}
                </strong>
                <small className="block text-xs leading-[1.6] text-ink-muted">
                  {step.value
                    ? time(step.value)
                    : step.passed
                      ? 'Waktu kedatangan tidak tercatat'
                      : completed
                        ? 'Tidak tercatat'
                        : 'Menunggu'}
                </small>
              </div>
            </li>
          );
        })}
      </ol>
      {task.stage === 'en_route' && (
        <Button className="mt-14 w-full" disabled={!!busy} onClick={onArrive}>
          {busy === 'arrive'
            ? 'Mencatat kedatangan…'
            : 'Saya Sudah Tiba & Mulai Pengerjaan'}
        </Button>
      )}
      {!completed && (task.demo || canShare || sharing) && (
        <Button
          size="sm"
          variant="accent"
          className="mt-12"
          disabled={!!busy}
          onClick={onShare}
        >
          <UiIcon name="pin" />
          {task.demo
            ? 'Perbarui lokasi contoh'
            : sharing
              ? 'Hentikan Berbagi Lokasi'
              : 'Mulai Berbagi Lokasi GPS'}
        </Button>
      )}
    </section>
  );
}
