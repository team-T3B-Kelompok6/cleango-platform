# Strategi render frontend

Frontend memakai App Router Next.js 16.4. Data admin dirender oleh Server Components, sedangkan dialog, filter, editor, pending/error feedback, serta polling memakai Client Components.

| Route | Strategi |
| --- | --- |
| `/login` | Form client dengan Server Action; sesi ditangani di server. |
| `/`, `/pesanan`, `/jadwal`, `/layanan`, `/faq`, `/customer`, `/petugas` | Render server dinamis di layout admin yang memeriksa cookie sesi. Filter/pencarian disimpan dalam query URL. |
| Detail `/[resource]/[id]` | Data dibaca di server, ditampilkan lewat popup yang juga dapat dibuka dari URL langsung. |
| Form tambah | Server menyiapkan opsi form; client mengelola interaksi. Admin dapat menambah shift, layanan, petugas, dan FAQ. Pendaftaran customer/pembuatan booking bukan alur admin. |
| `/laporan` | Agregasi server dari order dan periode terpilih; tab memakai query URL. |
| `/laporan/export` | Route Handler membentuk CSV berdasarkan sesi dan filter request. |
| `/tugas/[token]` | Server memvalidasi token tugas; portal client mengelola tahap, durasi, foto, laporan, dan polling. |
| `/api/admin/cleaner-tasks` | BFF admin untuk board/dispatch. |
| `/api/tugas/[token]` dan foto | BFF dengan akses terbatas pada tugas terkait. |
| `/_not-found` | Halaman fallback statis. |

`lib/api.ts` bersifat server-only. Pada mode API, request memakai `API_URL`, Bearer token dari cookie, `cache: no-store`, dan timeout 10 detik. React.cache menghindari pembacaan identik dalam satu render/request, bukan menjadi cache permanen database. Respons 401 mengarahkan ke login; respons error/invalid ditangani sebagai kesalahan data.

Server Actions memvalidasi form, menyimpan lewat adapter, dan memperbarui route. Loading boundary menampilkan Memuat data; error boundary menyediakan Coba lagi. Browser checklist memverifikasi keduanya menggunakan fixture lambat/gagal dan pemulihan.

AdminLiveSync memeriksa revisi tugas tiap lima detik dan menyegarkan tampilan saat berubah; polling ditunda ketika tab tersembunyi atau pengguna sedang mengisi form. Portal cleaner memakai polling tersendiri. Status dan waktu memakai catatan tugas individu yang sama untuk profil petugas, daftar/detail pesanan, dan portal.

`ADMIN_DEMO_ENABLED=true` hanya berlaku pada development dan menyimpan data lokal terpisah. Build produksi tidak menjadikan demo admin sebagai pengganti API. API tim belum diterima; perilaku produksi memerlukan pengujian ulang setelah endpoint dan database tersedia.
