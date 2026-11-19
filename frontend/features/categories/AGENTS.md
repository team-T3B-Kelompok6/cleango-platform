# Aturan `features/categories/`

Kategori dipakai dua resource (layanan dan FAQ), jadi ini fitur bersama, bukan milik
`services` atau `faqs`.

## Isi

| Berkas                              | Lapisan | Isi                                                             |
| ----------------------------------- | ------- | --------------------------------------------------------------- |
| `api/categoriesApi.ts`              | server  | `listCategories`, `create/update/deleteCategoryRecord`          |
| `api/categoryActions.ts`            | server  | Server Action `addCategory`, `updateCategory`, `removeCategory` |
| `data/categoryTypes.ts`             | data    | `ManagedCategory`                                               |
| `data/categoryStyles.ts`            | data    | kelas bersama popup kategori                                    |
| `data/categoryValidation.ts`        | data    | `validateCategoryIcon`, teks bantuan form                       |
| `hooks/useCategoryForm.ts`          | client  | state form + pratinjau ikon                                     |
| `components/CategoryForm.tsx`       | client  | form tambah/ubah + hapus kategori                               |
| `components/CategoryManager.tsx`    | client  | bar aksi "Kelola Kategori"                                      |
| `components/CategoryDeleteForm.tsx` | client  | konfirmasi hapus (dengan pilihan cascade)                       |
| `components/CategoryIconUpload.tsx` | client  | pemilih ikon                                                    |
| `components/CategoryPicker.tsx`     | client  | pemilih kategori untuk layanan/promo                            |
| `index.ts`                          | barrel  | dipakai `components/resource/ResourcePages` dan form            |

`CategoryIcon` sengaja tinggal di `components/ui/CategoryIcon.tsx` karena dipakai juga oleh
`components/Filters` (komponen bersama), dan komponen bersama tidak boleh mengimpor fitur.

## Aturan

1. **Kategori layanan memakai `/admin/categories`** saat mode demo nonaktif; jangan mengubah
   `categoryPath()` tanpa menguji kedua mode.
2. **Cascade hapus wajib disengaja.** `CategoryDeleteForm` mengirim `cascade` hanya bila admin
   memilihnya; jangan menghapus layanan secara diam-diam.
3. **Ikon divalidasi di klien dan server.** `validateCategoryIcon()` hanya untuk UX; server
   tetap memeriksa tipe/ukuran berkas.
4. **Nama "Sofa dan Kasur" dinormalkan menjadi "Sofa"** pada mode native; aturan itu ada di
   API dan action, jangan diduplikasi di komponen.
5. **Teks di `categoryStyles.ts`/`categoryValidation.ts`**, bukan di `.tsx`.
