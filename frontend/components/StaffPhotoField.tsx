'use client';

import { useEffect, useRef, useState } from 'react';
import { StaffAvatar } from './StaffAvatar';
import { UiIcon } from './UiIcon';

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
    <div className="staff-photo-field">
      <strong>Foto petugas</strong>
      <div className="staff-photo-controls">
        <StaffAvatar name={name} src={preview} className="staff-photo-large" />
        <div>
          <div className="staff-photo-actions">
            <button
              type="button"
              className="button"
              disabled={pending}
              onClick={() => input.current?.click()}
            >
              {preview ? 'Ganti foto' : 'Unggah foto'}
            </button>
            {(preview || fileError) && (
              <button
                type="button"
                className="button"
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
              </button>
            )}
          </div>
          <small className="field-hint">JPG, PNG, WebP · maks. 2 MB</small>
        </div>
      </div>
      <input
        ref={input}
        type="file"
        className="service-file-input"
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
        <p className="field-error" role="alert">
          {fileError || error}
        </p>
      )}
    </div>
  );
}
