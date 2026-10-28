import type { RecordData, Resource } from '@/types';

// Check fields added to the admin contract so older APIs cannot silently drop them.
export function unsavedFields(
  resource: Resource,
  sent: Record<string, unknown>,
  saved: RecordData,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (resource === 'schedules') {
    for (const field of ['staff', 'date', 'time', 'status'])
      if (saved[field] !== sent[field])
        errors[field] =
          'Perubahan shift belum tersimpan. Periksa dukungan jadwal petugas pada API.';
  }
  if (resource === 'orders') {
    if (
      !Array.isArray(saved.staff) ||
      JSON.stringify([...saved.staff].sort()) !==
        JSON.stringify([...(sent.staff as string[])].sort())
    )
      errors.staff = 'Perubahan petugas belum tersimpan pada pesanan.';
    if (saved.status !== sent.status)
      errors.status = 'Status pesanan belum tersimpan.';
  }
  if (resource === 'services') {
    if (
      'iconUrl' in sent &&
      (!Object.hasOwn(saved, 'iconUrl') ||
        (saved.iconUrl ?? null) !== sent.iconUrl)
    )
      errors.serviceIcon =
        'Perubahan ikon belum tersimpan pada layanan. Periksa dukungan ikon pada API.';
    if (
      'discountPrice' in sent &&
      (saved.discountPrice == null ? null : Number(saved.discountPrice)) !==
        (sent.discountPrice ?? null)
    )
      errors.discountPrice =
        'Harga promo lama belum dihapus oleh layanan data. Diskon sekarang dikelola melalui Kelola Promo.';
    if (
      'imageUrl' in sent &&
      (!Object.hasOwn(saved, 'imageUrl') ||
        (saved.imageUrl ?? null) !== sent.imageUrl)
    )
      errors.serviceImage = 'Perubahan foto belum tersimpan pada layanan.';
  }
  if (
    resource === 'staff' &&
    'photoUrl' in sent &&
    (!Object.hasOwn(saved, 'photoUrl') ||
      (saved.photoUrl ?? null) !== sent.photoUrl)
  )
    errors.staffPhoto = 'Perubahan foto petugas belum tersimpan.';
  if (resource === 'staff' && Array.isArray(sent.skills)) {
    if (
      !Array.isArray(saved.skills) ||
      JSON.stringify([...saved.skills].sort()) !==
        JSON.stringify([...sent.skills].sort())
    )
      errors.skills =
        'Keahlian petugas belum tersimpan. Data petugas lainnya mungkin sudah diperbarui.';
  }
  return errors;
}
