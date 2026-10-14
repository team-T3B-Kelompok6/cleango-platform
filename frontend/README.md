# Web Admin CleanGo

Web admin CleanGo untuk mengelola operasional layanan kebersihan. Dibuat dengan Next.js App Router, React, dan TypeScript.

## Fitur

- Login dan logout admin.
- Dashboard, aktivitas pesanan, notifikasi, dan panduan SOP.
- Kelola pesanan: pencarian, filter status/tanggal, detail, perubahan data, penugasan petugas, dan hapus.
- Kelola jadwal: lihat, ubah, dan hapus; jadwal berasal dari pesanan aplikasi pelanggan.
- Kelola layanan, FAQ, dan petugas: tambah, lihat, ubah, dan hapus.
- Tambah kategori layanan dan FAQ dari halaman pengelolaan.
- Banner home aplikasi: tombol Tambah Banner Promo di sebelah Tambah Layanan Baru. Gambar dapat dilihat, diganti, dan dihapus dari tab Promo beranda; tulisan promo dibuat di dalam gambar.
- Profil petugas dengan daftar keahlian.
- Kelola pelanggan: lihat, ubah, hapus, serta tambah manual bila diperlukan.
- Laporan per periode dan ekspor CSV.
- Simulasi tracking petugas dengan peta, status, dan progres tugas.

Pesanan dan jadwal dibuat dari aplikasi pelanggan, sehingga tidak tersedia tombol tambah pada kedua menu tersebut. Tracking masih menggunakan data contoh.

## Menjalankan proyek

Gunakan Node.js 22.12 atau lebih baru. Dari folder `frontend`:

```powershell
npm install
Copy-Item .env.example .env.local
```

Isi `.env.local` dengan alamat API, termasuk prefix `/api`:

```dotenv
API_URL=http://127.0.0.1:3001/api
```

```sh
npm run dev
```

Buka [localhost:3000](http://localhost:3000). Pastikan backend Express berjalan di port 3001. Login memakai akun demo **admin@cleango.id / 321321**. Autentikasi dilakukan melalui server.

Backend di `main` sudah menyediakan login, layanan, FAQ, petugas, dan pembacaan pesanan. Endpoint jadwal, customer, banner/upload, kategori khusus web admin, serta penyimpanan keahlian petugas masih perlu dilengkapi sesuai kontrak frontend. Jika endpoint kategori belum tersedia, filter dan form memakai nama kategori dari data layanan/FAQ yang dikirim API.

Untuk build produksi dan pemeriksaan kode:

```sh
npm run typecheck
npm run format:check
npm run build
npm run start
```

## Struktur frontend

```text
app/
├── login/          # Halaman login
├── (admin)/        # Dashboard dan halaman pengelolaan
├── actions.ts      # Server Actions
├── layout.tsx
└── tokens.css      # Warna, ukuran teks, dan spacing
components/         # Komponen tampilan dan interaksi
lib/                # API dan konfigurasi resource
types/              # Tipe data
public/assets/      # Gambar dan ikon
public/branding/    # Logo CleanGo
docs/               # Kontrak API dan bukti pengujian
```

Halaman dan layout menggunakan Server Components. Komponen client dipakai untuk dialog, filter, form interaktif, dan peta. URL API disimpan di environment server, dan token sesi menggunakan cookie HttpOnly.

Font memakai `next/font`, gambar memakai `next/image`, dan warna serta spacing disimpan sebagai CSS variables. Panduan bentuk data dan respons error tersedia di [kontrak API](docs/API-CONTRACT.md).

## Strategi render

| Halaman                     | Strategi | Alasan                                        |
| --------------------------- | -------- | --------------------------------------------- |
| `/login`                    | SSR      | Memeriksa sesi dan memproses login            |
| `/`                         | SSR      | Menampilkan statistik pesanan terkini         |
| `/pesanan` dan detail/form  | SSR      | Status dan penugasan dapat berubah            |
| `/jadwal` dan detail/form   | SSR      | Jadwal petugas dapat berubah                  |
| `/layanan` dan detail/form  | SSR      | Harga dan publikasi mengikuti data terbaru    |
| `/faq` dan detail/form      | SSR      | Daftar mengikuti perubahan pertanyaan         |
| `/petugas` dan detail/form  | SSR      | Profil dan ketersediaan mengikuti API         |
| `/customer` dan detail/form | SSR      | Profil dan riwayat mengikuti API              |
| `/laporan` dan ekspor       | SSR      | Ringkasan mengikuti periode yang dipilih      |
| `/_not-found`               | SSG      | Tampilan 404 bawaan tidak memerlukan data API |

Halaman admin memakai `dynamic = 'force-dynamic'` dan fetch `cache: 'no-store'`. Dynamic route `[id]` mengambil detail dari API; data yang tidak ditemukan ditangani dengan `notFound()`. Form menggunakan `useActionState` dan `useFormStatus` untuk pesan error dan status pengiriman.

## Pengujian

Build, TypeScript, dan format kode sudah lolos. Tampilan diuji pada desktop 1280px, tablet 768px, ponsel 360px, serta landscape 800×360. Pengujian meliputi login, CRUD, penugasan petugas, filter, dialog, dan kondisi kosong/error.

CRUD layanan, FAQ, dan petugas telah diintegrasikan dengan Express dan MySQL/MariaDB lokal.

- [Hasil build](docs/figma-fix/build.txt)
- [Pengujian fitur admin](docs/admin-actions/README.md)
- [Hasil pengecekan 11 Oktober 2026](docs/admin-actions/AUDIT-2026-10-11.md)
- [Revisi logo, kategori, promo, dan form 13 Oktober 2026](docs/admin-actions/REVISION-2026-10-13.md)
- [Pemeriksaan tampilan seluruh halaman 14 Oktober 2026](docs/visual-audit-2026-10-13/AUDIT-2026-10-14.md)
- [Penyesuaian font dan jarak teks 14 Oktober 2026](docs/typography-2026-10-14/README.md)
- [Pengujian tracking](docs/tracking/qa.json)

## Desain dan screenshot

Desain mengikuti prototype [Figma CleanGo fix](https://www.figma.com/design/1lr9CMyydP3dI6axuKAUg6/CleanGo-fix?node-id=4002-7854). Ukuran disesuaikan secara visual dan masih dapat berubah mengikuti desain final.

| Halaman   | Prototype terbaru                     | Web                                                            |
| --------- | ------------------------------------- | -------------------------------------------------------------- |
| Login     | [Figma](docs/figma-fix/login.jpg)     | [Screenshot](docs/visual-audit-2026-10-13/login-after.png)     |
| Dashboard | [Figma](docs/figma-fix/dashboard.jpg) | [Screenshot](docs/visual-audit-2026-10-13/dashboard-after.png) |
| Pesanan   | [Figma](docs/figma-fix/pesanan.jpg)   | [Screenshot](docs/visual-audit-2026-10-13/pesanan-after.png)   |
| Jadwal    | [Figma](docs/figma-fix/jadwal.jpg)    | [Screenshot](docs/visual-audit-2026-10-13/jadwal-after.png)    |
| Layanan   | [Figma](docs/figma-fix/layanan.jpg)   | [Screenshot](docs/visual-audit-2026-10-13/layanan-after.png)   |
| Petugas   | [Figma](docs/figma-fix/petugas.jpg)   | [Screenshot](docs/visual-audit-2026-10-13/petugas-after.png)   |
| Pelanggan | [Figma](docs/figma-fix/customer.jpg)  | [Screenshot](docs/visual-audit-2026-10-13/customer-after.png)  |
| Laporan   | [Figma](docs/figma-fix/laporan.jpg)   | [Screenshot](docs/visual-audit-2026-10-13/laporan-after.png)   |
| FAQ       | [Figma](docs/figma-fix/faq.jpg)       | [Screenshot](docs/visual-audit-2026-10-13/faq-after.png)       |

Lihat [catatan desain](docs/figma-fix/README.md) untuk rincian tampilan dan [panduan tracking](docs/TRACKING.md) untuk penggunaan simulasi peta.
