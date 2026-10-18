# Strategi render frontend CleanGo

Build Next.js 16.4.0 menandai seluruh halaman aplikasi sebagai `ƒ` (server-rendered on demand), sementara `/_not-found` bertanda `○` (static). Bukti: [build.txt](build.txt). Client Component tidak berarti seluruh halaman dirender hanya di browser.

| Route | Strategi | Alasan |
| --- | --- | --- |
| `/login` | Server Component, `force-dynamic`; form interaktif Client Component. | Membaca cookie sesi dan mode environment; error/loading form melalui Server Action. |
| `/` dashboard | Server Component dinamis di layout admin. | Ringkasan dihitung dari data order saat request; sesi wajib. |
| `/pesanan`, `/jadwal` | Server Component + komponen daftar/form/popup. | Data dan opsi dibaca server; filter URL, dialog dan input dikelola komponen interaktif. |
| `/layanan`, `/faq`, `/customer`, `/petugas` | Server Component dinamis; Client Component untuk editor/dialog. | Sumber data API berada di server. CRUD dikirim lewat Server Actions. |
| Detail `/:resource/[id]` | Data/detail dirender server, shell dialog interaktif. | URL tetap dapat dibuka langsung; ringkasan/form ditampilkan dalam popup di atas daftar. |
| `/customer/new`, `/faq/new`, `/layanan/new`, `/petugas/new` | Route Server Component dinamis. | Membaca sesi/opsi form terbaru. Pesanan/jadwal tidak memiliki route create admin. |
| `/laporan` | Server Component dinamis. | Periode dan tab dari query URL; agregasi dari order yang tersedia. |
| `/laporan/export` | Route Handler dinamis. | Memverifikasi sesi melalui data layer dan membentuk CSV dari filter saat request. |
| `/tugas/[token]` | Server Component `force-dynamic` + `CleanerPortal` client. | Memvalidasi link satu tugas sebelum mengirim data minimum; polling, GPS, foto dan tombol berjalan pada client. |
| `/api/admin/cleaner-tasks` | Route Handler. | Admin session → adapter tugas/dispatch; status berdasarkan hasil integrasi. |
| `/api/tugas/[token]`, `/foto/[id]` | Route Handler. | Token membatasi akses ke tugas terkait; update tahap/foto/laporan, lalu revalidate data admin. |
| `/api/admin/demo-media/[id]` | Route Handler khusus demo development. | Media lokal diberi pemeriksaan sesi; path tidak dibuka sebagai file bebas. |
| `/_not-found` | Prerender static. | Halaman fallback tidak memerlukan data per pengguna. |

## Pengambilan dan perubahan data

`lib/api.ts` bersifat `server-only`. Pada mode API, request memakai `API_URL`, `cache: 'no-store'`, batas waktu 10 detik, dan Bearer token dari cookie `cleango-session`. Error jaringan menjadi 503, JSON tidak valid menjadi 502, dan 401 pada data terlindungi memicu login ulang. `React.cache` menghindari pembacaan identik dalam render/request yang sama; ini bukan cache permanen database.

Server Actions menerima form, memvalidasi field, memanggil request API, dan memperbarui route setelah berhasil. Client form memiliki pending/error feedback. Loading boundary menampilkan “Memuat data…”, error boundary menyediakan Coba lagi, dan pencarian kosong menampilkan Reset filter.

Pada development dengan `ADMIN_DEMO_ENABLED=true`, data layer sengaja memakai store lokal `.local/cleaner-demo` sebagai pengganti upstream. Mode tersebut tidak menjadi bukti integrasi REST tim. Production build menonaktifkan mode admin demo; saat start, API backend harus tersedia. Secret dan file environment tidak dikirim ke browser atau disertakan dalam bukti UTS.

Perubahan jam shift memakai `scheduleShifts` dan `shiftOf` dari satu modul. Hal ini hanya menyamakan presentasi daftar/editor; kuota/roster pekerja tetap membutuhkan kontrak backend.
