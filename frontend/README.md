# Cleango Frontend

Frontend admin Cleango menggunakan **Next.js 16.4 App Router, React 19, TypeScript/TSX**, mengikuti ketentuan UTS Express + Next.js. Lingkup pengerjaan pengguna adalah **frontend saja**. Express, database, seed akun dan penyimpanan menjadi tugas anggota backend.

PRD aktif berada di [../../CLEANGO-PRD.md](../../CLEANGO-PRD.md), di luar folder kode. Arsip Vite berada di ../../cleango-vite-reference/. Panduan dan status audit per halaman: [DESIGN-AUDIT.md](docs/DESIGN-AUDIT.md).

## Menjalankan dari nol

Gunakan Node.js 22.12+ atau 24+.

```powershell
cd "C:\Users\athlon\Documents\code\web admin cleango\frontend"
npm install
Copy-Item .env.example .env.local
```

Isi `.env.local` dengan alamat API tim, termasuk prefix `/api`:

```dotenv
API_URL=http://127.0.0.1:4000/api
```

```sh
npm run dev
# http://127.0.0.1:3000
npm run typecheck
npm run format:check
npm run build
npm run start
```

Backend belum tersedia saat migrasi ini dikerjakan. Login dan operasi data baru dapat berjalan setelah API memenuhi [kontrak frontend](docs/API-CONTRACT.md). Data awal fitur utama dan autentikasi menggunakan API. Akun **admin / admin** perlu disediakan oleh anggota backend pada data seed. Tautan lupa kata sandi sudah dihapus. Tracking petugas memakai skenario dummy terpisah sesuai permintaan pengguna; lihat [panduan tracking](docs/TRACKING.md).

Jika API belum dikonfigurasi/tidak dapat dihubungi, login menampilkan pesan gagal koneksi; halaman admin menampilkan error boundary. Build tetap dapat dijalankan tanpa API karena halaman admin dirender saat request.

## Implementasi

- `app/(admin)/`: dashboard, pesanan, jadwal, layanan, FAQ, customer, petugas, laporan. Setiap resource mempunyai daftar, `/new`, dan `/[id]`.
- `app/login/page.tsx`: login; `app/actions.ts`: login/logout, tambah/ubah/hapus dan penugasan.
- `lib/api.ts`: `server-only`, membaca `API_URL`, token cookie HttpOnly, memeriksa `res.ok`, timeout, deduplikasi pembacaan per render memakai React `cache`.
- `lib/resources.ts` dan `types/`: konfigurasi field/status dan model JSON. Ini konfigurasi antarmuka, bukan data dummy.
- `components/`: Client Component kecil untuk filter, popup, navigasi, form; komponen daftar dan penyusun form tetap di server.
- `components/tracking/`, `lib/demo/tracking.ts`, `types/tracking.ts`: dialog, peta Leaflet dan skenario simulasi tracking. State lokal dibuang saat dialog ditutup; tidak mengubah data pesanan.
- `app/tokens.css`: warna, ukuran teks dan spacing; `globals.css`, `admin.css`, `overrides.css`, `design.css`: slicing dan revisi visual responsif.
- `next/font`: DM Sans dan Plus Jakarta Sans. Ikon SVG lokal memakai `next/image`. Panda memakai SVG, bukan emoji.

Data awal diambil oleh async Server Components. Filter/search memakai query URL dan data difilter di server. Form memakai Server Actions, `useActionState`, `useFormStatus`, validasi server, `revalidatePath`, lalu `redirect`. `params` dynamic route di-await; HTTP 404 API memanggil `notFound()`. Tersedia `loading.tsx`, `error.tsx`, `not-found.tsx`, empty state dan status pending.

Browser tidak memanggil Express langsung. RSC/Server Actions mengambil data antarserver, sehingga `API_URL` dan access token tidak perlu diekspos sebagai `NEXT_PUBLIC_*`. Backend wajib memeriksa token dan peran admin pada setiap endpoint.

## Strategi render

| Halaman                                        | Strategi | Alasan                                                 |
| ---------------------------------------------- | -------- | ------------------------------------------------------ |
| `/login`                                       | SSR      | Memeriksa sesi dan memproses login server              |
| `/`                                            | SSR      | Statistik dihitung dari data pesanan terkini           |
| `/pesanan`, `/pesanan/new`, `/pesanan/[id]`    | SSR      | Status, filter dan penugasan berubah saat operasional  |
| `/jadwal`, `/jadwal/new`, `/jadwal/[id]`       | SSR      | Jadwal dan pembagian shift dapat berubah               |
| `/layanan`, `/layanan/new`, `/layanan/[id]`    | SSR      | Harga dan publikasi harus mencerminkan perubahan admin |
| `/faq`, `/faq/new`, `/faq/[id]`                | SSR      | Pertanyaan dan status publikasi berubah melalui form   |
| `/petugas`, `/petugas/new`, `/petugas/[id]`    | SSR      | Kontak/status dan ketersediaan petugas terkini         |
| `/customer`, `/customer/new`, `/customer/[id]` | SSR      | Profil dan status pelanggan terkini                    |
| `/laporan`, `/laporan/export`                  | SSR      | Periode dan ringkasan pesanan dari API                 |
| `/_not-found`                                  | SSG      | Tampilan 404 bawaan tidak memerlukan data pribadi      |

Halaman operasional memakai `dynamic = 'force-dynamic'` dan fetch `cache: 'no-store'`. SSG/ISR tidak dipaksakan pada halaman admin yang bersesi. Bukti build aktual tersedia di [log build](docs/build-output.txt) dan [gambar output build](docs/screenshots/build-output.png).

## Pemeriksaan

Verifikasi menggunakan **fixture HTTP sementara di luar aplikasi**, karena Express milik kelompok belum dibuat. Fixture tidak termasuk frontend yang dikumpulkan dan tidak menjadi backend/database kelompok. Ini membuktikan perilaku frontend sesuai kontrak; belum membuktikan integrasi Express atau penyimpanan database.

- Semua menu diperiksa pada 1280×820, 768×1024, 360×800 dan landscape 800×360.
- Login valid/tidak valid, routing, tab status, tanggal, popup dan lebar halaman diperiksa.
- Hasil pengukuran dan uji alur terdapat pada [QA layout](docs/revised/login-dashboard-pesanan-jadwal-layanan-petugas-customer-laporan-faq-qa.json) dan [QA alur](docs/revised/flow-qa.json).
- Uji ulang terhadap API Express nyata wajib dilakukan sebelum pengumpulan.

Tracking diuji pada empat ukuran layar: memilih daftar/marker, pencarian/status, lokasi terlambat, simulasi mulai/jeda/reset, progres selesai, footer tetap, Escape dan akses dari pesanan/profil petugas. Bukti ada di [QA tracking](docs/tracking/qa.json) dan [build tracking](docs/tracking-build.txt). Tile peta diganti fixture SVG selama QA otomatis; tampilan normal memakai OpenStreetMap dengan atribusi. Data tracking berlabel Simulasi, bukan GPS aktual.

## Bukti tampilan dan pembandingan Figma

Referensi: [prototype Figma Cleango](https://www.figma.com/proto/ymMzgCxXWLUncDBzi1e4Oq/Cleango?node-id=139-2). Prototype berhasil dibuka dan screenshot sembilan halaman sudah disimpan. [Audit per halaman](docs/DESIGN-AUDIT.md) mencatat perbedaan awal terhadap screenshot web dengan fixture. Revisi sembilan halaman sudah diterapkan satu per satu dengan skill figma-design-to-code, PRD dan tugas dosen. Layer/aset MCP masih dibatasi; tidak ada klaim pixel-perfect.

| Halaman        | Figma prototype                                 | Web                                        |
| -------------- | ----------------------------------------------- | ------------------------------------------ |
| Login          | [Prototype](docs/figma-prototype/login.png)     | [Web](docs/revised/login-1280x820.png)     |
| Dashboard      | [Prototype](docs/figma-prototype/dashboard.png) | [Web](docs/revised/dashboard-1280x820.png) |
| Kelola pesanan | [Prototype](docs/figma-prototype/pesanan.png)   | [Web](docs/revised/pesanan-1280x820.png)   |
| Jadwal         | [Prototype](docs/figma-prototype/jadwal.png)    | [Web](docs/revised/jadwal-1280x820.png)    |
| Layanan        | [Prototype](docs/figma-prototype/layanan.png)   | [Web](docs/revised/layanan-1280x820.png)   |
| Petugas        | [Prototype](docs/figma-prototype/petugas.png)   | [Web](docs/revised/petugas-1280x820.png)   |
| Customer       | [Prototype](docs/figma-prototype/customer.png)  | [Web](docs/revised/customer-1280x820.png)  |
| Laporan        | [Prototype](docs/figma-prototype/laporan.png)   | [Web](docs/revised/laporan-1280x820.png)   |
| FAQ            | [Prototype](docs/figma-prototype/faq.png)       | [Web](docs/revised/faq-1280x820.png)       |

Screenshot prototype masih memuat viewer dan beberapa frame panjang terpotong. Hasil revisi sudah diperiksa pada empat ukuran layar dengan fixture API. Pemeriksaan layer/token terbaru dan integrasi API Express nyata tetap diperlukan sebelum pengumpulan.

## Pekerjaan tim yang masih diperlukan

Anggota backend menyediakan Express, database SQL/seed, `.env.example`, petunjuk menjalankan backend dan kontrak API yang disepakati. Tim melengkapi screenshot pembandingan desain, repo GitHub public, PR per anggota, board Trello, data kelompok dan presentasi. Frontend ini tidak membuat undangan, mengunggah file atau menerbitkan repo atas nama tim.

Dokumentasi teknis: [Server/Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components), [form Server Actions](https://nextjs.org/docs/app/guides/forms).
