import type { CleanerTask } from '@/types/cleaner';
import { stageLabels } from '@/types/cleaner';
import { displayId } from '@/lib/display';
import { date } from '@/lib/cleaner/format';
import { Button, UiIcon, buttonVariants } from '@/components/ui';
import { CustomerContact } from './CustomerContact';
import {
  cardClass,
  journeyLabels,
  metaTextClass,
  sectionHeadingClass,
  sectionMetaClass,
  sectionTitleClass,
  tagClass,
} from '../../data/portalStyles';

/** Tampilan tugas sebelum keberangkatan: GPS, reservasi, dan perjalanan. */
export function AssignedPanel({
  task,
  sharing,
  busy,
  onShare,
  maps,
  customerWA,
  displayedTime,
}: {
  task: CleanerTask;
  sharing: boolean;
  busy: string;
  onShare: () => void;
  maps: string;
  customerWA: string | null;
  displayedTime: string;
}) {
  return (
    <>
      <section className={cardClass + ' flex items-start gap-10'}>
        <span className="grid size-32 shrink-0 place-items-center rounded-full bg-warning-soft text-warning">
          <UiIcon name="pin" />
        </span>
        <div className="min-w-0 flex-1">
          <div className={sectionHeadingClass + ' mb-6'}>
            <h2 className="text-base leading-[1.55] font-semibold text-ink">
              {task.demo ? 'Bagikan lokasi' : 'Nyalakan GPS HP Anda'}
            </h2>
            <span className={metaTextClass}>
              {sharing
                ? 'GPS Berbagi Aktif'
                : task.location
                  ? 'Lokasi Tersimpan'
                  : 'Belum Aktif'}
            </span>
          </div>
          <p className="text-xs leading-[1.7] break-words text-ink-muted">
            {task.demo
              ? 'Pratinjau lokasi. GPS langsung belum terhubung.'
              : sharing
                ? 'GPS HP sedang berbagi lokasi secara berkala ke admin dan pelanggan. Browser harus tetap terbuka (tidak ada jaminan berjalan di latar belakang).'
                : 'Bagikan lokasi saat siap berangkat. Konfirmasikan kedatangan melalui tombol di halaman tugas.'}
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="mt-10 border-warning-line bg-warning-soft text-warning hover:bg-warning-soft"
            disabled={!!busy}
            onClick={onShare}
          >
            <UiIcon name="pin" />
            {busy === 'location'
              ? 'Memperbarui lokasi…'
              : task.demo
                ? 'Perbarui lokasi contoh'
                : sharing
                  ? 'Hentikan Berbagi Lokasi'
                  : 'Mulai Berbagi Lokasi GPS'}
          </Button>
        </div>
      </section>

      <section className={cardClass}>
        <div className={sectionHeadingClass}>
          <div>
            <small className="block text-xs text-ink-muted">ID RESERVASI</small>
            <h1 className="text-xl leading-[1.5] tracking-[-0.025em] break-words">
              #{displayId(task.orderId)}
            </h1>
          </div>
          <span className={tagClass}>{stageLabels[task.stage]}</span>
        </div>
        <div className="mb-16 flex flex-col gap-7 rounded-md bg-surface-soft p-12">
          <strong className="flex items-start gap-7 text-sm leading-[1.55] text-ink">
            <UiIcon name="services" className="mt-2 size-[15px] text-accent" />
            {task.service}
          </strong>
          <span className="flex items-start gap-7 text-xs leading-[1.55] text-ink-muted">
            <UiIcon name="calendar" className="mt-2 size-[15px] text-accent" />
            {date(task.date)} · {displayedTime}
          </span>
          <span className="flex items-start gap-7 text-xs leading-[1.55] text-ink-muted">
            <UiIcon name="person" className="mt-2 size-[15px] text-accent" />
            {task.staffName}
          </span>
        </div>
        <CustomerContact task={task} href={customerWA} />
        <p className="mt-14 flex items-start gap-6 text-sm text-ink">
          <UiIcon name="pin" className="mt-3 size-[15px] text-accent" />
          {task.address}
        </p>
        <div className="mt-12 flex min-h-108 flex-col items-center justify-center gap-5 rounded-md bg-surface-tint p-18 text-center">
          <UiIcon name="pin" className="size-24 text-accent" />
          <span className="text-xs text-ink-muted">Tujuan pengerjaan</span>
          <strong className="text-xs leading-[1.6] font-medium text-ink">
            {task.address}
          </strong>
        </div>
        <a
          className={buttonVariants({
            size: 'sm',
            variant: 'ghost',
            className:
              'mt-9 w-full border-transparent bg-info-soft text-accent',
          })}
          href={maps}
          target="_blank"
          rel="noopener noreferrer"
        >
          <UiIcon name="arrow" />
          Buka Google Maps Navigasi
        </a>
        {task.notes && (
          <aside className="mt-14 flex items-start gap-8 rounded-md bg-warning-soft p-12">
            <UiIcon name="paw" className="mt-3 size-[15px] text-warning" />
            <div>
              <strong className="mb-1 block text-xs leading-[1.5] tracking-[0.03em] text-warning uppercase">
                Catatan Khusus Pelanggan
              </strong>
              <p className="text-xs leading-[1.7] text-ink-muted">
                {task.notes}
              </p>
            </div>
          </aside>
        )}
      </section>

      <section className={cardClass}>
        <div className={sectionHeadingClass}>
          <h2 className={sectionTitleClass}>Perjalanan Pesanan</h2>
          <small className={sectionMetaClass}>1 dari 4 tahap</small>
        </div>
        <ol className="m-0 flex list-none flex-col p-0">
          {journeyLabels.map(([label, hint], index) => (
            <li
              key={label}
              className={
                'relative flex items-start gap-10 ' +
                (index === journeyLabels.length - 1 ? 'pb-0' : 'pb-18')
              }
            >
              {index !== journeyLabels.length - 1 && (
                <i className="absolute top-28 bottom-0 left-13 w-px bg-line" />
              )}
              <span
                className={
                  'grid size-28 shrink-0 place-items-center rounded-full text-xs ' +
                  (index === 0
                    ? 'bg-accent text-white'
                    : 'bg-surface-tint text-ink-muted')
                }
              >
                {index === 0 ? <UiIcon name="services" /> : index + 1}
              </span>
              <div>
                <strong className="block text-sm leading-[1.6] text-ink">
                  {label}
                </strong>
                <small className="block text-xs leading-[1.6] text-ink-muted">
                  {hint}
                </small>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
