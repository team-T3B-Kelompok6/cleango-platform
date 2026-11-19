# Aturan `lib/`

Kode lintas fitur yang tidak punya JSX: util murni, perhitungan domain, dan akses data
`server-only`. Semua yang dipakai lebih dari satu fitur harus tinggal di sini, bukan disalin.

## Isi

| Kelompok                 | Contoh                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Transport & sesi         | `api/` (`serverApi`, `resourceApi`, `http`, `session`)                                                      |
| Util murni               | `cn.ts`, `pagination.ts`, `display.ts`, `detail-return.ts`                                                  |
| Perhitungan domain       | `staff.ts`, `staff-schedules.ts`, `customers.ts`, `tracking.ts`, `promo-rules.ts`                           |
| Aturan form              | pindah ke fitur: `features/staff/data/staffFormPayload.ts`, `features/customers/data/customerValidation.ts` |
| Akses data `server-only` | `audit-api.ts`, `service-image.ts`, `demo/`, `cleaner/`                                                     |

Aturan/perhitungan milik satu fitur pindah ke `features/<fitur>/data/` (mis.
`scheduleRules`, `serviceFormRules`, `promoEditor`, `faqDisplay`, `faqValidation`,
`categoryValidation`, `reportRules`). `lib/promo-rules.ts`, `lib/staff.ts`,
`lib/staff-schedules.ts`, `lib/customers.ts`, dan `lib/tracking.ts` tetap di sini karena
dipakai lintas fitur (pesanan, jadwal, petugas, tracking).

## Aturan

1. **Satu fungsi satu tempat.** Kalau dipakai dua halaman, pindahkan ke `lib/` (mis.
   `formatDate()` di `lib/display.ts`). Jangan menyalin.
2. **Tanpa JSX dan tanpa React hook.** Kalau butuh state, itu `hooks/`.
3. **Pisahkan murni dan `server-only`.**
   - Fungsi murni (format, hitung, validasi) harus bisa diimpor client dan diuji tanpa
     jaringan.
   - File yang menyentuh `cookies()`, `process.env`, atau membuat request wajib
     `import 'server-only'` di baris pertama.
4. **Transport hanya lewat `lib/api/`.** Jangan memanggil `fetch`/`axios` langsung dari
   `lib/*` non-api; pakai `request`/`list`/`detail` atau `upstreamRequest`.
5. **Nama file camelCase.** Ekspor fungsi bernama; hindari default export.
6. **Jangan menambah dependensi** untuk hal yang bisa diselesaikan dengan fungsi murni.
7. **Harness uji**: fungsi penting sebaiknya punya `scripts/check-*.mjs` yang bisa dijalankan
   tanpa backend.

## Larangan

- Menyimpan secret, token, atau data pribadi (foto customer, nomor telepon) di repo.
- Menaruh teks UI di `lib/`; teks milik fitur ada di `features/<fitur>/data/` atau
  `components/<fitur>/data.ts`.
