# Strategi render CleanGo

Bukti: [log build produksi](checks/build.txt). Hasil build menandai halaman aplikasi dengan `ƒ` (dirender saat permintaan) dan `/_not-found` dengan `○` (prerender statis).

| Rute | Strategi | Alasan |
| --- | --- | --- |
| /login | SSR dinamis | Membaca cookie sesi dan melakukan login lewat Server Action. |
| / dan layout admin | SSR dinamis | Sesi admin, notifikasi, dan statistik mengambil data terbaru. |
| /pesanan, /jadwal | SSR dinamis | Status, jadwal, dan penugasan dapat berubah. |
| /layanan, /faq, /petugas, /customer | SSR dinamis | Katalog dan pengelolaan data mengikuti API. |
| /audit-log | SSR dinamis | Filter, pagination, dan snapshot mengikuti log server; tanpa fallback demo pada API yang belum ada. |
| Semua detail /[id] dan /new | SSR dinamis | Detail diambil per ID; form mengambil pilihan resource terbaru. |
| /laporan dan /laporan/export | SSR dinamis | Agregasi dan CSV mengikuti periode serta data pesanan. |
| /tugas/[token] | SSR dinamis + interaksi client | Token tugas divalidasi server; perubahan tahap dan laporan lewat route API. |
| /api/admin/cleaner-tasks dan API tugas | Route Handler saat diminta | Sesi admin atau token tugas diverifikasi sesuai konteks. |
| /_not-found | SSG/prerender | Halaman tidak ditemukan bawaan tidak perlu data API. |

## Pembagian server dan client

- Halaman dan penyusun daftar merupakan Server Components. `lib/api.ts` memakai `server-only`, cookie HttpOnly, bearer token server-side, dan `fetch` dengan `cache: 'no-store'`.
- Komponen client menangani dialog, filter interaktif, form, peta, dan portal cleaner. Ini tidak menjadikan seluruh halaman CSR.
- Server Actions memvalidasi form, memanggil adapter API, lalu melakukan invalidasi dengan `revalidatePath`. Pada development demo, adapter sengaja beralih ke store lokal.
- Loading menggunakan `loading.tsx` dan streaming. Error boundary adalah Client Component dengan tombol `retry` sesuai versi Next.js yang terpasang. Respons 401 mengarahkan ke login.
- Respons detail yang tidak ada diteruskan ke `notFound()`. Ekspor CSV memakai Route Handler dan memitigasi formula spreadsheet pada nilai sel.
- Foto dan font menggunakan komponen Next.js sesuai proyek. Mode demo bukan prerender produksi; `ADMIN_DEMO_ENABLED` dinonaktifkan oleh kode saat `NODE_ENV=production`.

## Bukti runtime

[Loading](screenshots/api-loading-1280.jpg) menangkap skeleton saat fixture HTTP diperlambat. Screenshot [error 360px](screenshots/api-error-360.jpg)/[1280px](screenshots/api-error-1280.jpg) memperlihatkan 503, dan [pemulihan](screenshots/api-recovery-1280.jpg) memperlihatkan hasil Coba lagi. Kondisi kosong ditangkap pada [360px](screenshots/api-empty-360.jpg) dan [1280px](screenshots/api-empty-1280.jpg). Badge issue pada screenshot error berasal dari development Next.js dan kesalahan 503 yang sengaja dipicu.

Tidak ada klaim bahwa seluruh halaman SSG, semuanya CSR, atau demo menunjukkan koneksi database produksi.
