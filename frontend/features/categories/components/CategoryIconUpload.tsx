'use client';
import Image from 'next/image';
import type { RefObject } from 'react';
import { Button, UiIcon } from '@/components/ui';
import { errorClass, hintClass, labelClass } from '../data/categoryStyles';

/** Unggah/ganti/hapus ikon kategori dengan pratinjau. */
export function CategoryIconUpload({
  id,
  preview,
  error,
  pending,
  inputRef,
  onSelect,
  onRemove,
}: {
  id: string;
  preview: string;
  error: string;
  pending: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onSelect: (file?: File) => void;
  onRemove: () => void;
}) {
  return (
    <div>
      <label htmlFor={id + '-icon'} className={labelClass}>
        Ikon kategori
      </label>
      <div className="mt-10 flex items-center gap-14">
        <span className="grid size-64 shrink-0 place-items-center rounded-control border border-line bg-surface-soft">
          {preview ? (
            <Image
              src={preview}
              alt="Pratinjau ikon kategori"
              width={48}
              height={48}
              className="size-48 object-contain"
              unoptimized
            />
          ) : (
            <UiIcon name="image" className="size-24 text-ink-muted" />
          )}
        </span>
        <div>
          <div className="flex items-center gap-10">
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
            >
              {preview ? 'Ganti ikon' : 'Unggah ikon'}
            </Button>
            {(preview || error) && (
              <Button
                variant="ghost"
                aria-label="Hapus ikon kategori"
                disabled={pending}
                onClick={onRemove}
              >
                <UiIcon name="trash" />
              </Button>
            )}
          </div>
          <small className={hintClass}>JPG, PNG, WebP · maks. 2 MB</small>
        </div>
      </div>
      <input
        ref={inputRef}
        id={id + '-icon'}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-label="Unggah ikon kategori"
        disabled={pending}
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
