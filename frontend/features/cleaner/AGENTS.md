# Aturan `features/cleaner/`

Portal petugas: akses memakai token tautan tugas (bukan sesi admin), mobile-first, dan bisa
ditanam sebagai iframe di dialog Pantau Petugas.

## Isi

| Berkas                           | Lapisan | Isi                                                                      |
| -------------------------------- | ------- | ------------------------------------------------------------------------ |
| `api/cleanerClientApi.ts`        | browser | `fetchCleanerTask`, `sendCleanerEvent`, `uploadCleanerPhoto`, `taskGone` |
| `hooks/useCleanerTask.ts`        | client  | state tugas, polling 5 dtk, aksi tahap, unggah foto, GPS                 |
| `hooks/locationWatch.ts`         | murni   | `watchLocation()` — filter fix basi, throttle, stop idempoten            |
| `components/CleanerPortal.tsx`   | client  | perangkai halaman                                                        |
| `components/TaskUnavailable.tsx` | server  | tampilan tautan tidak valid/kedaluwarsa                                  |
| `components/portal/*`            | markup  | header, panel, kartu tahap/foto/laporan, footer aksi                     |
| `data/portalStyles.ts`           | data    | kelas bersama + label perjalanan                                         |
| `pages/CleanerPage.tsx`          | server  | `getCleanerTask()` lalu render portal atau `TaskUnavailable`             |
| `index.ts`                       | barrel  | dipakai `app/tugas/[token]/page.tsx`                                     |

## Aturan transport

1. **Token tugas hanya dikirim ke Route Handler Next** `/api/tugas/[token]`; jangan
   memanggil Express langsung dari browser.
2. **Route Handler tetap memegang** rate limit, `checkOrigin`, batas ukuran body, dan header
   `no-store`/`no-referrer` — jangan dipindah ke hook.
3. **Tanpa retry otomatis.** Setiap event membawa idempotency key; permintaan yang gagal
   tidak boleh diulang otomatis karena bisa menggandakan aksi.
4. **`fetch` lebih tepat daripada axios di sini** karena unggah `FormData` dan pemanggil
   butuh status HTTP untuk menghentikan GPS pada 401/403/404/410. Alasan ini juga tertulis di
   `api/cleanerClientApi.ts`.
5. **Polling tidak boleh berjalan saat `document.hidden`**, saat aksi sedang berjalan, atau
   saat GPS sedang mengirim.

## Aturan dampak

1. **`lib/cleaner/service.ts` tetap lintas fitur** karena dipakai assignment, tracking, dan
   Route Handler. Jangan memindahkannya ke sini.
2. **`lib/cleaner/demo-store.ts`** tetap sumber data demo.
3. **Setelah aksi sukses**, beri tahu parent (`postMessage('cleango-task-updated')`) agar
   halaman admin menyegarkan diri.
4. **Bersihkan GPS** saat tugas selesai, dibatalkan, kedaluwarsa, atau komponen unmount.

## Batas verifikasi

GPS dan unggah foto hanya bisa dibuktikan di perangkat/HTTPS dengan tugas nyata. Tanpa
token valid, halaman hanya membuktikan tampilan `TaskUnavailable`.
