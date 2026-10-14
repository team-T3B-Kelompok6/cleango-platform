'use client';
import { useActionState, useEffect, useId, useState } from 'react';
import { saveBanner } from '@/app/banner-actions';
import { useDialogClose } from './DialogTrigger';
import { SubmitButton } from './Form';
import type { Banner } from '@/types';
import Image from 'next/image';

export function BannerForm({ banner }: { banner?: Banner }) {
  const [state, action] = useActionState(
    saveBanner.bind(null, banner?.id ?? null),
    {},
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(banner?.imageUrl ?? '');
  const [error, setError] = useState('');
  const id = useId();
  const close = useDialogClose();
  useEffect(() => {
    if (!file) {
      setPreview(banner?.imageUrl ?? '');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, banner?.imageUrl]);
  const imageError = error || state.errors?.bannerImage;
  return (
    <form
      className="next-form"
      action={(data) => {
        if (file) data.set('bannerImage', file);
        action(data);
      }}
    >
      <div className="modal-body manage-form">
        <p className="banner-form-hint">
          Unggah gambar banner untuk home aplikasi. Tulisan atau desain promo
          dibuat langsung di dalam gambar.
        </p>
        <label htmlFor={id}>Gambar banner promo</label>
        <div className="promo-upload-preview">
          {preview ? (
            <Image
              src={preview}
              alt="Pratinjau banner promo"
              width={1200}
              height={400}
              unoptimized
            />
          ) : (
            <p>Pratinjau gambar banner</p>
          )}
        </div>
        <input
          id={id}
          type="file"
          name="bannerImage"
          accept="image/png,image/jpeg,image/webp"
          aria-invalid={!!imageError}
          aria-describedby={
            id + '-hint' + (imageError ? ' ' + id + '-error' : '')
          }
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (!selected) return;
            const invalid =
              !['image/png', 'image/jpeg', 'image/webp'].includes(
                selected.type,
              ) || selected.size > 2 * 1024 * 1024;
            setFile(invalid ? null : selected);
            setError(
              invalid ? 'Gunakan JPG, PNG, atau WebP, maksimal 2 MB.' : '',
            );
            if (invalid) event.target.value = '';
          }}
        />
        <small className="field-hint" id={id + '-hint'}>
          JPG, PNG, atau WebP · maks. 2 MB. Disarankan 1200 × 400 px.
          {banner && ' Gambar lama tetap dipakai jika tidak diganti.'}
        </small>
        {imageError && (
          <p className="field-error" id={id + '-error'} role="alert">
            {imageError}
          </p>
        )}
        {state.message && (
          <p className="form-error" role="alert">
            {state.message}
          </p>
        )}
      </div>
      <div className="modal-footer">
        <button className="button" type="button" onClick={() => close?.()}>
          Batal
        </button>
        <SubmitButton disabled={!!error}>Simpan banner</SubmitButton>
      </div>
    </form>
  );
}
