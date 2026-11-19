# Aturan `features/services/`

Kelola Layanan: daftar, pratinjau, dan form ubah (tambah lazimnya lewat form yang sama).

## Isi

| Berkas                             | Lapisan | Isi                                                   |
| ---------------------------------- | ------- | ----------------------------------------------------- |
| `api/servicesApi.ts`               | server  | `getServices`, `getService`                           |
| `components/ServiceList.tsx`       | server  | dispatcher daftar (memakai `RecordListProps`)         |
| `components/ServiceCard.tsx`       | server  | kartu layanan                                         |
| `components/ServiceForm.tsx`       | client  | form layanan (`useServiceForm`)                       |
| `components/ServicePhotoField.tsx` | client  | unggah foto layanan                                   |
| `components/ServiceFeatures.tsx`   | client  | daftar fasilitas                                      |
| `components/ServicePreview.tsx`    | server  | tampilan publik layanan                               |
| `data/serviceStyles.ts`            | data    | kelas bersama                                         |
| `data/serviceFormRules.ts`         | data    | `featureSlots`, `filledFeatureCount`, validasi form   |
| `hooks/useServiceForm.ts`          | client  | state form, unggah foto, fitur dinamis                |
| `index.ts`                         | barrel  | dipakai `ResourcePages`, `ResourceFormServer`, detail |

## Aturan

1. **Harga dan durasi tetap dari server.** Form hanya mengirim input; jangan menghitung ulang
   diskon/harga di klien.
2. **Foto**: validasi tipe/ukuran di `useServiceForm`, unggah lewat `lib/service-image.ts`.
   Jangan menambah endpoint unggah baru.
3. **Fitur layanan** disimpan sebagai daftar baris; jangan mengubah bentuk payload tanpa
   menyesuaikan `data/serviceFormRules.ts` dan validasi server.
4. **Kategori** berasal dari `features/categories`; jangan membaca tabel kategori sendiri.
5. **Tampilan publik** memakai `ServicePreview` yang sama dengan dialog detail; jangan
   menduplikasi markup.
