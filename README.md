# CleanGo

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
API_URL=http://127.0.0.1:4000/api
```

Lalu jalankan:

```sh
npm run dev
```

Buka [localhost:3000](http://localhost:3000). Login memerlukan API autentikasi yang sudah berjalan. Akun demo **admin / admin** perlu disediakan dalam seed backend.

## Menjalankan backend

Folder backend saat ini masih berupa setup awal dengan endpoint `/api/health`. Endpoint login dan data CleanGo belum tersedia.

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Atur `PORT=4000` agar sesuai dengan contoh `API_URL` frontend, lalu isi pengaturan database di `.env`.

```sh
npm run dev
```

Struktur tabel dan seed akan dilengkapi di `backend/database.sql` oleh bagian backend. Frontend dan backend dijalankan dari terminal terpisah.

## Status pengerjaan

Halaman frontend sudah mencakup login, dashboard, pesanan, jadwal, layanan, FAQ, customer, petugas, dan laporan. Pesanan serta jadwal dibuat melalui aplikasi pelanggan; admin dapat melihat, mengubah, dan menghapusnya. Penugasan petugas dilakukan dari menu pesanan.

Kategori layanan dan FAQ dapat ditambahkan sendiri. Tombol Tambah Banner Promo berada di sebelah Tambah Layanan Baru. Gambar banner home mobile dikelola terpisah dari layanan melalui tab Promo beranda. Profil petugas menggunakan daftar keahlian.

Integrasi API tim masih menunggu endpoint login dan data. Pengujian frontend sementara memakai API preview lokal. Tracking petugas juga masih simulasi dan belum menerima GPS dari aplikasi mobile.

Desain mengikuti prototype [Figma CleanGo fix](https://www.figma.com/design/1lr9CMyydP3dI6axuKAUg6/CleanGo-fix?node-id=4002-7854) dan masih dapat berubah mengikuti desain final.

Panduan frontend, strategi render, dan screenshot ada di [frontend/README.md](frontend/README.md). Daftar endpoint ada di [kontrak API](frontend/docs/API-CONTRACT.md).
