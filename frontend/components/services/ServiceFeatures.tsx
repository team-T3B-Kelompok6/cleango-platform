'use client';
import { Button, UiIcon } from '@/components/shared/ui';
import type { FeatureDraft } from '@/lib/service-form';
import { errorClass, hintClass, inputClass, sectionHeadingClass } from './data';

/** Daftar fasilitas layanan (maks. 15 butir). */
export function ServiceFeatures({
  features,
  filled,
  error,
  pending,
  onAdd,
  onChange,
  onRemove,
}: {
  features: FeatureDraft[];
  filled: number;
  error?: string;
  pending: boolean;
  onAdd: () => void;
  onChange: (key: number, value: string) => void;
  onRemove: (key: number) => void;
}) {
  return (
    <div className="flex flex-col gap-10">
      <div className={sectionHeadingClass}>
        <h4 className="text-sm font-semibold text-ink">
          Fasilitas untuk pelanggan
        </h4>
        <small className={hintClass}>{filled} fasilitas</small>
      </div>
      <div className="flex flex-col gap-8">
        {features.map((feature, index) => (
          <div className="flex items-center gap-8" key={feature.key}>
            <UiIcon name="tick" className="size-[14px] shrink-0 text-accent" />
            <input
              aria-label={'Fasilitas ' + (index + 1)}
              className={inputClass}
              value={feature.value}
              maxLength={120}
              disabled={pending}
              placeholder="Contoh: Menyapu dan mengepel seluruh ruangan"
              onChange={(event) => onChange(feature.key, event.target.value)}
            />
            <Button
              variant="ghost"
              size="sm"
              aria-label={'Hapus fasilitas ' + (index + 1)}
              disabled={pending}
              onClick={() => onRemove(feature.key)}
            >
              <UiIcon name="close" />
            </Button>
          </div>
        ))}
      </div>
      {!features.length && (
        <p className={hintClass}>
          Belum ada fasilitas. Cantumkan apa saja yang pelanggan dapatkan.
        </p>
      )}
      <Button
        variant="accent"
        size="sm"
        className="self-start gap-6"
        disabled={pending || features.length >= 15}
        onClick={onAdd}
      >
        <UiIcon name="plus" />
        Tambah fasilitas layanan
      </Button>
      {error && (
        <p className={errorClass} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
