# Aturan `components/`

Komponen React yang dipakai lintas halaman. Baca `../AGENTS.md` (aturan root frontend) lebih
dulu.

## Peta folder

| Folder     | Boleh berisi                                                                   | Tidak boleh                                    |
| ---------- | ------------------------------------------------------------------------------ | ---------------------------------------------- |
| `ui/`      | primitif presentasional tanpa domain (`Button`, `Input`, `Card`, `Modal`)      | fetch data, server action, teks khusus halaman |
| `layouts/` | kerangka halaman dengan slot (`AuthLayout`, `AdminShell`, `Sidebar`, `Topbar`) | state bisnis, fetch data, aturan domain        |
| `<nama>/`  | komponen lama yang dipakai ≥2 halaman dan belum masuk `features/<fitur>/`      | primitif generik (taruh di `ui/`)              |

Folder `shared/` sudah dihapus. `shared/ui` → `ui`, `shared/layout` → `layouts`. Jangan
menghidupkan kembali `components/shared/`.

Komponen baru milik satu alur bisnis **tidak** ditaruh di sini — masuk
`features/<fitur>/components/` (lihat `../features/AGENTS.md`).

## Folder yang belum dimigrasi

Folder berikut masih hidup dan dipakai halaman; pindahkan ke `features/<fitur>/` saat
halamannya disentuh:

`resource/` (shell CRUD generik), `booking/` (khusus editor pesanan).

Sudah pindah ke `features/`: `dashboard`, `orders`, `cleaner`, `categories`, `services`,
`schedules`, `promos`, `faqs`, `staff`, `customers`, `reports`, `audit` (lihat
`../features/AGENTS.md`). `CategoryIcon` dan `StaffAvatar` tinggal di `components/ui/`,
`DeliveryBadge` di `components/DeliveryBadge.tsx`, dan `tracking/` tetap di sini karena
dipakai fitur pesanan **dan** petugas.

## Pengecualian arah dependensi

`components/resource/ResourcePages.tsx`, `components/ResourceFormServer.tsx`,
`components/RecordDetailServer.tsx`, dan `components/ResourceSummary.tsx` adalah
**composition root** untuk shell CRUD generik: mereka boleh mengimpor `features/*` karena
tugasnya merangkai halaman, bukan menyediakan primitif. Komponen lain di folder ini tetap
dilarang mengimpor `features/*`.

`components/resource/` menyimpan shell CRUD generik (`ResourceListPage`,
`ResourceDetailPage`, `ResourceNewPage`) yang dipakai 6 resource. Resource yang sudah punya
folder sendiri (`orders`) mengisi daftarnya lewat komponen fitur; shell tetap generik.

Komponen di akar folder ini (`Filters`, `RecordActions`, `ResourceFormServer`,
`RecordDetailServer`, `DateCalendar`, `SopButton`, `SopDialog`, `DeleteRecordButton`,
`PromoManagerServer`, `ResourceSummary`, `RecordDetailLink`, `RecordDetailModal`,
`RecordListProps.ts`, `DeliveryBadge`) juga menunggu wave migrasi. `SubmitButton` tinggal
di `ui/SubmitButton.tsx` dan dipakai semua form.

## Aturan

1. **Arah dependensi satu arah**: `components/*` tidak boleh mengimpor `features/*`.
2. **Tanpa data.** Tidak ada `cookies()`, `process.env`, atau `fetch`. Data dikirim sebagai
   props dari halaman/layout.
3. **Pintu masuk**: impor lewat `@/components/ui/<Komponen>` atau barrel
   `@/components/ui`. Untuk folder yang punya `index.ts`, impor lewat barrel folder itu.
4. **Satu file satu komponen**, `.tsx` PascalCase, file non-`.tsx` camelCase
   (`data.ts`, `statusTone.ts`, `index.ts`).
5. **Tidak ada CSS baru.** Semua gaya memakai token `@theme` (lihat `DESIGN.md` §9).
6. **Logika bukan di sini.** Kalau satu komponen butuh hitungan, taruh fungsi murni di
   `lib/` dan hook-nya di `hooks/` atau `features/<fitur>/hooks/`.

## Verifikasi

`npm run typecheck` dan `npm run format:check`. Kalau memindahkan file, jalankan juga
`npm run build` karena harness `scripts/check-*.mjs` melakukan resolusi modul berbasis nama.
