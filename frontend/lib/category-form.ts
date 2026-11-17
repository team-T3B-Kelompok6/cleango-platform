/** Validasi ikon kategori (JPG/PNG/WebP, maks. 2 MB). */
export function validateCategoryIcon(file: File) {
  if (
    !file.size ||
    file.size > 2 * 1024 * 1024 ||
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
  )
    return 'Gunakan JPG, PNG, atau WebP, maksimal 2 MB.';
  return '';
}

/** Teks bantuan di bawah form kategori. */
export function categoryFormHelp({
  serviceCount,
  resource,
  editing,
}: {
  serviceCount: number;
  resource: 'services' | 'faq';
  editing: boolean;
}) {
  if (editing)
    return `${serviceCount} layanan dalam kategori ini. Perubahan nama berlaku untuk layanan di dalamnya.`;
  return `Kategori baru akan tersedia pada filter dan form ${
    resource === 'services' ? 'layanan' : 'FAQ'
  }.`;
}

/** Pesan konfirmasi hapus kategori. */
export function categoryDeleteMessage({
  name,
  serviceCount,
}: {
  name: string;
  serviceCount: number;
}) {
  const usage = serviceCount
    ? `${serviceCount} layanan masih menggunakan kategori ini. Pindahkan layanan terlebih dahulu, atau hapus seluruh layanannya bersama kategori.`
    : 'Kategori ini belum digunakan oleh layanan.';
  return `Hapus kategori “${name}”? ${usage} Penghapusan tidak dapat dibatalkan.`;
}

/** Label tombol hapus sesuai pilihan menghapus layanan. */
export function categoryDeleteLabel(deleteServices: boolean) {
  return deleteServices ? 'Hapus kategori & layanan' : 'Hapus kategori';
}
