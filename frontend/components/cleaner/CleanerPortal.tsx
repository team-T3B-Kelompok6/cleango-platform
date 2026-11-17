'use client';
import { useCleanerTask } from '@/hooks/useCleanerTask';
import { date } from '@/lib/cleaner/format';
import {
  ActionFooter,
  AssignedPanel,
  CleanerHeader,
  ReportCard,
  WorkingPanel,
} from './portal';

/** Halaman tugas petugas (mobile-first, bisa ditanam sebagai iframe). */
export function CleanerPortal({
  initial,
  token,
  embedded = false,
}: {
  initial: Parameters<typeof useCleanerTask>[0]['initial'];
  token: string;
  embedded?: boolean;
}) {
  const panel = useCleanerTask({ initial, token });
  const { task, assigned, completed } = panel;
  return (
    <main
      data-embedded={embedded || undefined}
      className={
        'mx-auto min-h-dvh bg-canvas text-ink ' +
        (assigned ? 'max-w-480 pb-16' : 'max-w-720 pb-152')
      }
    >
      <CleanerHeader assigned={assigned} completed={completed} />
      <div className="flex flex-col gap-14 px-16 py-18">
        {assigned ? (
          <AssignedPanel
            task={task}
            sharing={panel.sharing}
            busy={panel.busy}
            onShare={panel.shareLocation}
            maps={panel.maps}
            customerWA={panel.customerWA}
            displayedTime={panel.displayedTime}
          />
        ) : (
          <>
            <WorkingPanel
              task={task}
              maps={panel.maps}
              customerWA={panel.customerWA}
              displayedTime={panel.displayedTime}
              elapsed={panel.elapsed}
              steps={panel.steps}
              completed={completed}
              busy={panel.busy}
              canShare={panel.canShare}
              sharing={panel.sharing}
              endpoint={panel.endpoint}
              fileInput={panel.fileInput}
              onArrive={() => void panel.perform('arrive')}
              onShare={panel.shareLocation}
              onUpload={(file) => void panel.upload(file)}
              onRemove={(photoId) =>
                void panel.perform('remove_photo', { photoId })
              }
            />
            <ReportCard
              task={task}
              completed={completed}
              busy={panel.busy}
              summary={panel.summary}
              onSummary={panel.setSummary}
              checked={panel.checked}
              onChecked={panel.setChecked}
              onRetry={() => void panel.perform('retry_report')}
            />
          </>
        )}
        {!task.demo && (panel.canShare || panel.sharing) && (
          <p className="text-base leading-[1.7] text-ink-muted">
            Lokasi dikirim sekitar tiap 10 detik saat ada sinyal baru. Tetap
            buka halaman; pengiriman di latar belakang atau saat layar terkunci
            tidak dijamin. Berbagi berhenti saat tiba atau tugas berakhir.
          </p>
        )}
        {(panel.error || panel.gpsError) && (
          <p
            ref={panel.errorMessage}
            role="alert"
            className="rounded-md border border-danger-soft bg-danger-soft px-15 py-13 text-base leading-[1.7] text-danger"
          >
            {panel.error || panel.gpsError}
          </p>
        )}
        {panel.gpsNotice && !panel.gpsError && (
          <p
            role="status"
            className="rounded-md border border-line-strong bg-accent-soft px-15 py-13 text-base leading-[1.7] text-accent"
          >
            {panel.gpsNotice}
          </p>
        )}
        {panel.notice && (
          <p
            role="status"
            className="rounded-md border border-line-strong bg-accent-soft px-15 py-13 text-base leading-[1.7] text-accent"
          >
            {panel.notice}
          </p>
        )}
      </div>
      <ActionFooter
        task={task}
        assigned={assigned}
        completed={completed}
        busy={panel.busy}
        onDepart={() => void panel.perform('depart')}
        onComplete={() =>
          void panel.perform('complete', {
            summary: panel.summary,
            checked: panel.checked,
          })
        }
      />
      <p className="px-20 py-4 text-center text-xs text-ink-muted">
        CleanGo Field Portal · Link khusus tugas ini · Berlaku sampai{' '}
        {date(task.expiresAt)}
      </p>
    </main>
  );
}
