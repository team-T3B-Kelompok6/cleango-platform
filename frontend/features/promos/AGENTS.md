# Aturan `features/promos/`

Kelola Promo: daftar, form, pratinjau diskon, aktif/nonaktif, dan hapus.

## Isi

| Berkas                                                   | Lapisan | Isi                                                 |
| -------------------------------------------------------- | ------- | --------------------------------------------------- |
| `api/promoActions.ts`                                    | server  | `savePromo`, `removePromo`, `setPromoActive`        |
| `data/promoEditor.ts`                                    | data    | `PROMO_STATUSES`, `filterPromoList`, label & format |
| `data/promoStyles.ts`                                    | data    | kelas bersama                                       |
| `hooks/usePromoForm.ts`                                  | client  | state form + pratinjau                              |
| `hooks/usePromoList.ts`                                  | client  | filter daftar + aksi aktif/nonaktif                 |
| `components/PromoManagerServer.tsx`                      | server  | menyiapkan data promo untuk layanan                 |
| `components/PromoManager.tsx`                            | client  | bar aksi "Kelola Promo"                             |
| `components/PromoDialog.tsx`                             | client  | kerangka dialog promo                               |
| `components/PromoForm.tsx`                               | client  | form promo                                          |
| `components/PromoList.tsx` + `PromoRecord.tsx`           | client  | daftar dan baris promo                              |
| `components/PromoPreview.tsx` + `PromoServicePicker.tsx` | client  | pratinjau diskon                                    |
| `components/PromoDelete.tsx`                             | client  | konfirmasi hapus                                    |
| `index.ts`                                               | barrel  | dipakai `ResourcePages`                             |

## Aturan

1. **Rumus diskon hanya di `lib/promo-rules.ts`.** File itu juga diuji
   `npm run check:promo`; jangan menyalin perhitungan ke `promoEditor` atau komponen.
2. **`promoEditor.ts` hanya untuk UI** (status, filter, label, format tanggal/nama layanan).
3. **Harga akhir selalu berasal dari server.** Pratinjau hanya untuk membantu admin.
4. **Aktif/nonaktif lewat `setPromoActive`**, jangan `PATCH` langsung dari komponen.
5. **Promo terikat layanan**; gunakan `PromoServicePicker` agar pilihan tidak menyimpang dari
   daftar layanan server.
