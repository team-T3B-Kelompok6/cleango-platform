'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, UiIcon } from '@/components/ui';
import { StaffAvatar } from '@/components/ui/StaffAvatar';

/** Unggah/ganti/hapus foto petugas dengan pratinjau lokal. */
export function StaffPhotoField({
  name,
  url,
  file,
  removed,
  pending,
  error,
  onSelect,
  onRemove,
  onInvalid,
}: {
  name: string;
  url: string | null;
  file: File | null;
  removed: boolean;
  pending: boolean;
  error?: string;
  onSelect: (file: File) => void;
  onRemove: () => void;
  onInvalid: (invalid: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(url);
  const [fileError, setFileError] = useState('');
  useEffect(() => {
    if (!file) {
      setPreview(removed ? null : url);
      return;
    }
    const source = URL.createObjectURL(file);
    setPreview(source);
    return () => URL.revokeObjectURL(source);
  }, [file, removed, url]);
  return (
    <div className="mb-22">
      <strong className="mb-10 block text-xs font-semibold text-ink-soft">
        Foto petugas
      </strong>
      <div className="flex items-center gap-16">
        <StaffAvatar name={name} src={preview} size="lg" />
        <div>
          <div className="flex items-center gap-10">
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => input.current?.click()}
            >
              {preview ? 'Ganti foto' : 'Unggah foto'}
            </Button>
            {(preview || fileError) && (
              <Button
                variant="ghost"
                aria-label="Hapus foto petugas"
                disabled={pending}
                onClick={() => {
                  onRemove();
                  setFileError('');
                  onInvalid(false);
                  if (input.current) input.current.value = '';
                }}
              >
                <UiIcon name="trash" />
              </Button>
            )}
          </div>
          <small className="mt-8 block text-xs text-ink-muted">
            JPG, PNG, WebP · maks. 2 MB
          </small>
        </div>
      </div>
      <input
        ref={input}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Unggah foto petugas"
        disabled={pending}
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (!selected) return;
          if (
            !['image/jpeg', 'image/png', 'image/webp'].includes(
              selected.type,
            ) ||
            selected.size > 2 * 1024 * 1024
          ) {
            setFileError('Gunakan JPG, PNG, atau WebP, maksimal 2 MB.');
            onInvalid(true);
            event.target.value = '';
            return;
          }
          setFileError('');
          onInvalid(false);
          onSelect(selected);
        }}
      />
      {(fileError || error) && (
        <p className="mt-4 block text-sm font-normal text-danger" role="alert">
          {fileError || error}
        </p>
      )}
    </div>
  );
}
