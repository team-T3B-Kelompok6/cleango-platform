'use client';
import Image from 'next/image';
import type { RefObject } from 'react';
import { Button, UiIcon } from '@/components/ui';
import {
  errorClass,
  hintClass,
  sectionHeadingClass,
} from '../data/serviceStyles';

/** Foto utama layanan: pratinjau, ganti/hapus, dan area drag & drop. */
export function ServicePhotoField({
  preview,
  hasFile,
  imageFailed,
  dragging,
  pending,
  error,
  inputRef,
  onSelect,
  onRemove,
  onImageError,
  onDragState,
}: {
  preview: string;
  hasFile: boolean;
  imageFailed: boolean;
  dragging: boolean;
  pending: boolean;
  error: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onSelect: (file?: File) => void;
  onRemove: () => void;
  onImageError: () => void;
  onDragState: (dragging: boolean) => void;
}) {
  return (
    <div className="rounded-card border border-line bg-surface-soft p-12">
      <div className={sectionHeadingClass}>
        <strong className="text-sm font-semibold text-ink">
          Foto utama layanan
        </strong>
        <small className={hintClass}>JPG, PNG · maks. 2 MB</small>
      </div>
      <div className="relative grid aspect-[16/9] w-full place-items-center overflow-hidden rounded-control bg-canvas">
        {preview && !imageFailed ? (
          <Image
            src={preview}
            alt="Pratinjau foto layanan"
            width={800}
            height={450}
            className="h-full w-full object-cover"
            unoptimized
            onError={onImageError}
          />
        ) : (
          <div className="flex flex-col items-center gap-6 text-xs text-ink-muted">
            <UiIcon name="plus" className="size-24" />
            <span>
              {imageFailed
                ? 'Foto tidak dapat dimuat. Pilih foto lain.'
                : 'Tambahkan foto layanan'}
            </span>
          </div>
        )}
        {!!preview && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-8 bg-ink/60 px-10 py-6 text-xs text-white">
            <span>{hasFile ? 'Foto baru dipilih' : 'Foto saat ini'}</span>
            <span className="flex items-center gap-6">
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => inputRef.current?.click()}
              >
                Ganti
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Hapus foto layanan"
                disabled={pending}
                onClick={onRemove}
              >
                <UiIcon name="trash" />
              </Button>
            </span>
          </div>
        )}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          onDragState(true);
        }}
        onDragLeave={() => onDragState(false)}
        onDrop={(event) => {
          event.preventDefault();
          onDragState(false);
          if (!pending) onSelect(event.dataTransfer.files[0]);
        }}
        className={
          'mt-10 flex w-full items-center justify-center gap-6 rounded-control border border-dashed p-10 text-sm transition-colors ' +
          (dragging
            ? 'border-accent bg-accent-soft text-accent'
            : 'border-line-strong bg-surface text-ink-muted hover:border-accent-ring')
        }
      >
        <UiIcon name="plus" />
        Tarik foto ke sini atau unggah foto
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        aria-label="Unggah foto layanan"
        onChange={(event) => onSelect(event.target.files?.[0])}
      />
      {error && (
        <p className={errorClass} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
