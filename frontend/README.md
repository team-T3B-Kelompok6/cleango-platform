# Web Admin CleanGo

Web admin CleanGo untuk mengelola operasional layanan kebersihan. Dibuat dengan Next.js App Router, React, dan TypeScript.

## Fitur

- Login dan logout admin.
- Dashboard, aktivitas pesanan, notifikasi, dan panduan SOP.
- Kelola pesanan: pencarian, filter status/tanggal, detail, perubahan data, penugasan petugas, dan hapus.
- Kelola jadwal: lihat, ubah, dan hapus; jadwal berasal dari pesanan aplikasi pelanggan.
- Kelola layanan, FAQ, dan petugas: tambah, lihat, ubah, dan hapus.
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
API_URL=http://127.0.0.1:4000/api
```

```sh
npm run dev
```

Buka [localhost:3000](http://localhost:3000). Endpoint login dan data CleanGo masih menunggu backend tim. Login memerlukan API yang sudah berjalan dengan akun demo **admin / admin**. Autentikasi dilakukan melalui server.

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

Pengujian masih memakai API preview lokal. Integrasi dengan Express dan penyimpanan MySQL/MariaDB akan diuji setelah backend tersedia.

- [Hasil build](docs/figma-fix/build.txt)
- [Pengujian fitur admin](docs/admin-actions/README.md)
- [Hasil pengecekan 11 Oktober 2026](docs/admin-actions/AUDIT-2026-10-11.md)
- [Pengujian tracking](docs/tracking/qa.json)

## Desain dan screenshot

Desain mengikuti prototype [Figma CleanGo fix](https://www.figma.com/design/1lr9CMyydP3dI6axuKAUg6/CleanGo-fix?node-id=4002-7854). Ukuran disesuaikan secara visual dan masih dapat berubah mengikuti desain final.

| Halaman   | Prototype terbaru                     | Web                                                    |
| --------- | ------------------------------------- | ------------------------------------------------------ |
| Login     | [Figma](docs/figma-fix/login.jpg)     | [Screenshot](docs/figma-fix/result/login-1280.jpg)     |
| Dashboard | [Figma](docs/figma-fix/dashboard.jpg) | [Screenshot](docs/figma-fix/result/dashboard-1280.jpg) |
| Pesanan   | [Figma](docs/figma-fix/pesanan.jpg)   | [Screenshot](docs/figma-fix/result/pesanan-1280.jpg)   |
| Jadwal    | [Figma](docs/figma-fix/jadwal.jpg)    | [Screenshot](docs/figma-fix/result/jadwal-1280.jpg)    |
| Layanan   | [Figma](docs/figma-fix/layanan.jpg)   | [Screenshot](docs/figma-fix/result/layanan-1280.jpg)   |
| Petugas   | [Figma](docs/figma-fix/petugas.jpg)   | [Screenshot](docs/figma-fix/result/petugas-1280.jpg)   |
| Pelanggan | [Figma](docs/figma-fix/customer.jpg)  | [Screenshot](docs/figma-fix/result/customer-1280.jpg)  |
| Laporan   | [Figma](docs/figma-fix/laporan.jpg)   | [Screenshot](docs/figma-fix/result/laporan-1280.jpg)   |
| FAQ       | [Figma](docs/figma-fix/faq.jpg)       | [Screenshot](docs/figma-fix/result/faq-1280.jpg)       |

Lihat [catatan desain](docs/figma-fix/README.md) untuk rincian tampilan dan [panduan tracking](docs/TRACKING.md) untuk penggunaan simulasi peta.
