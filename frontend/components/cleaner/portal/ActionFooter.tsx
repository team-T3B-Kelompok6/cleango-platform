import type { CleanerTask } from '@/types/cleaner';
import { Button, UiIcon } from '@/components/shared/ui';
import { DeliveryBadge } from '../DeliveryBadge';

/** Footer aksi utama: berangkat, selesai, atau status selesai. */
export function ActionFooter({
  task,
  assigned,
  completed,
  busy,
  onDepart,
  onComplete,
}: {
  task: CleanerTask;
  assigned: boolean;
  completed: boolean;
  busy: string;
  onDepart: () => void;
  onComplete: () => void;
}) {
  return (
    <footer
      className={
        assigned
          ? 'mx-16 mb-14 flex flex-col gap-8 rounded-[14px] border border-line bg-surface p-14'
          : 'fixed bottom-0 left-1/2 z-20 flex w-[min(720px,100%)] -translate-x-1/2 flex-col gap-8 border-t border-line bg-surface/95 px-18 py-14 backdrop-blur-[6px]'
      }
    >
      {assigned ? (
        <>
          <Button
            size="lg"
            className="min-h-52 w-full rounded-card text-lg"
            disabled={!!busy}
            onClick={onDepart}
          >
            <UiIcon name="bike" />
            {busy === 'depart'
              ? 'Mencatat Keberangkatan…'
              : 'Berangkat Sekarang'}
          </Button>
          <small className="text-center text-xs leading-[1.6] text-ink-muted">
            Klik saat mulai perjalanan menuju lokasi pelanggan.
          </small>
        </>
      ) : !completed ? (
        <>
          <Button
            size="lg"
            className="min-h-52 w-full rounded-card text-lg"
            disabled={!!busy || task.stage !== 'working'}
            onClick={onComplete}
          >
            <UiIcon name="tick" />
            {busy === 'complete'
              ? 'Menyimpan & Memproses Laporan…'
              : 'Selesai & Kirim Laporan ke WA'}
          </Button>
          <small className="text-center text-xs leading-[1.6] text-ink-muted">
            {task.stage === 'en_route'
              ? 'Konfirmasikan tiba dan mulai pengerjaan terlebih dahulu.'
              : task.demo
                ? 'Laporan dan waktu selesai akan disimpan.'
                : 'Laporan disimpan dahulu. Hasil pengiriman ditampilkan terpisah.'}
          </small>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-6 text-center text-accent">
          <UiIcon name="tick" />
          <strong className="text-md">
            {task.report
              ? 'Tugas Selesai · Laporan Tersimpan'
              : 'Pesanan Selesai'}
          </strong>
          {task.report && (
            <small className="basis-full text-xs text-ink-muted">
              Pengiriman laporan:{' '}
              <DeliveryBadge delivery={task.reportDelivery} />
            </small>
          )}
        </div>
      )}
    </footer>
  );
}
