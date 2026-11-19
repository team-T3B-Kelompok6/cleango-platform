import type { RefObject } from 'react';
import Image from 'next/image';
import type { CleanerTask } from '@/types/cleaner';
import { UiIcon } from '@/components/ui';
import {
  cardClass,
  sectionHeadingClass,
  sectionMetaClass,
  sectionTitleClass,
} from '../../data/portalStyles';

/** Foto bukti kerja: unggah, hapus, dan batas jumlah. */
export function PhotoCard({
  task,
  completed,
  busy,
  endpoint,
  fileInput,
  onUpload,
  onRemove,
}: {
  task: CleanerTask;
  completed: boolean;
  busy: string;
  endpoint: string;
  fileInput: RefObject<HTMLInputElement | null>;
  onUpload: (file?: File) => void;
  onRemove: (photoId: string) => void;
}) {
  return (
    <section className={cardClass}>
      <div className={sectionHeadingClass}>
        <h2 className={sectionTitleClass}>
          Foto Bukti Kerja{' '}
          <small className="font-normal text-ink-muted">(Opsional)</small>
        </h2>
        <small className={sectionMetaClass}>
          {task.photos.length} Foto Tersimpan
        </small>
      </div>
      <div className="flex flex-wrap items-center gap-10">
        {task.photos.map((photo, index) => (
          <figure
            key={photo.id}
            className="relative h-90 w-106 overflow-hidden rounded-[9px] bg-surface-soft"
          >
            <Image
              src={endpoint + '/foto/' + photo.id}
              width={120}
              height={90}
              alt={'Bukti kerja ' + (index + 1)}
              className="h-full w-full object-cover"
              unoptimized
              referrerPolicy="no-referrer"
            />
            {!completed && (
              <button
                type="button"
                aria-label={'Hapus foto ' + (index + 1)}
                disabled={!!busy}
                onClick={() => onRemove(photo.id)}
                className="absolute top-4 right-4 grid size-24 place-items-center rounded-full bg-ink/80 text-white"
              >
                <UiIcon name="close" className="size-[13px]" />
              </button>
            )}
            <figcaption className="absolute inset-x-0 bottom-0 bg-ink/60 px-7 py-5 text-xs text-white">
              Foto {index + 1}
            </figcaption>
          </figure>
        ))}
        {!completed && task.stage === 'working' && task.photos.length < 3 && (
          <button
            type="button"
            className="flex h-90 w-76 flex-col items-center justify-center gap-6 rounded-[9px] border border-dashed border-line-strong bg-surface-tint text-xs text-accent"
            disabled={!!busy}
            onClick={() => fileInput.current?.click()}
          >
            <UiIcon name="image" />
            {busy === 'photo' ? 'Mengunggah…' : '+ Foto'}
          </button>
        )}
        <p className="min-w-140 flex-1 text-xs leading-[1.7] text-ink-muted">
          {completed && !task.photos.length
            ? 'Belum ada foto bukti kerja untuk pesanan ini.'
            : 'JPG/PNG, maksimal 3 foto · 2 MB per foto. Foto tersimpan bersama laporan.'}
        </p>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png"
        aria-label="Unggah foto bukti kerja"
        className="hidden"
        onChange={(event) => onUpload(event.target.files?.[0])}
      />
    </section>
  );
}
