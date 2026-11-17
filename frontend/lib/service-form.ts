import type { RecordData } from '@/types';

export type FeatureDraft = { key: number; value: string };

/** Validasi foto layanan (JPG/PNG, maks. 2 MB). */
export function validateServiceImage(file: File) {
  if (
    !['image/jpeg', 'image/png'].includes(file.type) ||
    file.size > 2 * 1024 * 1024
  )
    return 'Gunakan JPG atau PNG, maksimal 2 MB.';
  return '';
}

/** Nilai awal form layanan. */
export function serviceFormValues(
  initial: Partial<RecordData>,
  categories: string[],
) {
  return {
    name: String(initial.name ?? ''),
    category: String(initial.category ?? categories[0] ?? ''),
    duration: String(initial.duration ?? ''),
    description: String(initial.description ?? ''),
    price: String(initial.price ?? ''),
    active: initial.active !== false,
    features: featureDrafts(initial.features),
  };
}

/** Daftar fasilitas untuk diedit. */
export function featureDrafts(value: unknown): FeatureDraft[] {
  return (Array.isArray(value) ? value : []).map((feature, key) => ({
    key,
    value: String(feature),
  }));
}

/** Gabungkan fasilitas menjadi payload FormData. */
export function composeFeaturePayload(features: FeatureDraft[]) {
  return features
    .map((feature) => feature.value.trim())
    .filter(Boolean)
    .join('\n');
}

/** Jumlah fasilitas yang benar-benar terisi. */
export function filledFeatureCount(features: FeatureDraft[]) {
  return features.filter((feature) => feature.value.trim()).length;
}
