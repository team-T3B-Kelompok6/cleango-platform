# CleanGo

Perubahan terbaru frontend: [revisi antarmuka 16 Oktober 2026](frontend/docs/ui-revision-2026-10-16/README.md), termasuk popup detail/ubah terpisah, promo terpusat, FAQ langsung terbuka, dan Pantau per petugas. Dokumentasi audit sebelumnya disimpan sebagai riwayat.

CleanGo adalah aplikasi pemesanan layanan kebersihan. Web admin digunakan untuk mengatur pesanan, jadwal kerja, layanan, petugas, pelanggan, FAQ, dan laporan.

Frontend menggunakan Next.js, React, dan TypeScript. Backend menggunakan Express dengan MySQL/MariaDB dan masih dalam tahap pengembangan. Aplikasi mobile dikerjakan terpisah.

## Struktur proyek

```text
cleango-platform/
├── backend/       # REST API Express dan database
├── frontend/      # Web admin Next.js
│   ├── app/       # Halaman dan routing
│   ├── components/
│   ├── lib/       # Pemanggil API
│   ├── types/
│   ├── public/    # Aset gambar dan ikon
│   └── docs/      # Kontrak API, screenshot, dan hasil pengujian
└── README.md
```

PRD (`CLEANGO-PRD.md`) dan dokumen tugas (`soal-project-express-next.md`) disimpan di folder induk, di luar repositori kode.

## Menjalankan frontend

Gunakan Node.js 22.12 atau lebih baru. Dari folder repositori:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
```

Isi alamat API tim di `.env.local`:

```dotenv
API_URL=http://127.0.0.1:3001/api
```

Lalu jalankan:

```sh
npm run dev
```

Buka [localhost:3000](http://localhost:3000). Mode API memerlukan backend autentikasi yang sudah berjalan. Akun seed backend tim adalah **admin@cleango.id / 321321**. Untuk demo frontend tanpa backend, isi `ADMIN_DEMO_ENABLED=true` dalam `.env.local`, jalankan development, lalu masuk dengan **admin / admin**. Mode demo hanya berlaku pada development dan diberi penanda jelas.

## Menjalankan backend

Folder backend di branch frontend ini masih berupa setup awal dengan endpoint `/api/health`. Implementasi backend tim yang lebih lengkap berada di `main`; gunakan revisi dari penanggung jawab backend sebelum pengujian integrasi. Revisi frontend tidak mengganti isi folder backend.

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Gunakan `PORT=3001` agar sesuai dengan contoh `API_URL` frontend, lalu isi pengaturan database di `.env` sesuai backend yang dipakai.

```sh
npm run dev
```

Struktur tabel, seed, dan langkah menyiapkan database mengikuti revisi backend tim. File `backend/database.sql` pada setup awal branch ini belum berisi tabel aplikasi. Frontend dan backend dijalankan dari terminal terpisah.

## Status pengerjaan

Halaman frontend sudah mencakup login, dashboard, pesanan, jadwal, layanan, FAQ, customer, petugas, dan laporan. Pesanan serta jadwal dibuat melalui aplikasi pelanggan; admin dapat melihat, mengubah, dan menghapusnya. Penugasan petugas dilakukan dari menu pesanan.

Kategori layanan dan FAQ dapat ditambahkan sendiri. Tombol Tambah Banner Promo berada di sebelah Tambah Layanan Baru dan hanya meminta gambar untuk beranda mobile. Foto utama, harga promo langsung, serta fasilitas diedit melalui Ubah Layanan. Kelola Promo di sebelah Tambah kategori mengatur kode diskon, cakupan layanan, periode, dan kuota. Profil petugas menggunakan daftar keahlian.

Backend `main` yang terakhir diperiksa sudah menyediakan login dan beberapa resource, tetapi belum selesai menurut konfirmasi pengguna. Endpoint/field untuk pesanan, jadwal, customer, keahlian, gambar, banner, kategori, kode promo, dan tugas cleaner masih perlu disamakan dengan [kontrak frontend](frontend/docs/API-CONTRACT.md). Pengujian terbaru memakai demo development serta fixture HTTP terisolasi; hasilnya belum membuktikan penyimpanan database atau sinkronisasi mobile.

Pantau Petugas menyediakan halaman tugas dalam popup serta link terpisah untuk HP. Alurnya mencakup keberangkatan, mulai bekerja, foto, laporan selesai, status pengiriman, dan kirim ulang. Tiga pesanan `[UJI]` dapat disiapkan/diulang tanpa duplikasi melalui mode `CLEANER_DEMO_ENABLED=true`. Data uji tersimpan di disk server dan seluruh pengirimannya simulasi. Peta animasi lama tetap diberi label contoh; GPS, penyimpanan tugas produksi, dan pengiriman sungguhan memerlukan integrasi backend. Panduan mencoba dari HP dan alur uji ada di [README frontend](frontend/README.md#mencoba-alur-cleaner).

Desain mengikuti prototype [Figma CleanGo fix](https://www.figma.com/design/1lr9CMyydP3dI6axuKAUg6/CleanGo-fix?node-id=4002-7854) dan masih dapat berubah mengikuti desain final.

Panduan frontend, strategi render, dan screenshot ada di [frontend/README.md](frontend/README.md). Daftar endpoint ada di [kontrak API](frontend/docs/API-CONTRACT.md).

Repositori: [team-T3B-Kelompok6/cleango-platform](https://github.com/team-T3B-Kelompok6/cleango-platform). Paket terbaru tersedia di [bukti UTS 16 Oktober 2026](frontend/docs/uts-2026-10-16/README.md): pengujian browser, kontrak HTTP, screenshot Figma, strategi render, panduan uji manual, dan daftar integrasi untuk backend. Backend tim belum selesai; hasil dummy/fixture belum membuktikan integrasi database atau provider pesan.
