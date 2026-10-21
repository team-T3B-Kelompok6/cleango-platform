# Pemeriksaan akhir UTS CleanGo — 21 Oktober 2026

**Kesimpulan: pengujian frontend lokal dan kontrak HTTP lolos. Integrasi produksi belum dapat dinyatakan selesai.** Endpoint tim belum mencakup seluruh fitur, dan uji bersama database/WhatsApp asli belum dilakukan. PPT tidak dibuat sesuai permintaan.

## Lingkungan dan kode

- Frontend: `C:\Users\athlon\Documents\code\web admin cleango\frontend`.
- Repositori: [team-T3B-Kelompok6/cleango-platform](https://github.com/team-T3B-Kelompok6/cleango-platform).
- Checkout lokal: branch `athlonxe`, commit dasar `8dc0812ceadced568e363cb4dc28f467cf2a1bc1`.
- HEAD remote yang diperiksa: `a9d000141641a9d217d842eb443d35fb2b1c35bf`. Perubahan lokal belum di-commit/push; URL GitHub belum merupakan salinan seluruh perubahan terbaru.
- UI diuji memakai direktori data sementara, terpisah dari data demo pengguna.
- HTTP diuji lewat fixture loopback port 4410 dan frontend port 3003, bukan backend tim. Port 3000 milik pengguna tetap tersedia.
- Ponsel diuji dengan viewport browser 360 piksel, bukan perangkat fisik.

## Checklist tugas

| Checklist | Hasil pemeriksaan | Bukti / batasan |
| --- | --- | --- |
| Login sampai logout | Lolos demo dan fixture | Login salah ditolak; login benar, logout, proteksi halaman, sesi HTTP 401 diuji. |
| Seluruh navigasi sidebar | Lolos | Sembilan tautan: dashboard, pesanan, jadwal, layanan, FAQ, customer, petugas, laporan, audit. |
| Form CRUD layanan | Lolos demo UI dan HTTP | Validasi wajib, tambah, simpan setelah refresh, ubah harga, hapus setelah refresh. Unggah gambar diuji lewat HTTP. |
| Pesanan, jadwal, petugas, customer, FAQ | Lolos pada cakupan lokal | Daftar, detail dan editor dibuka di UI; mutasi diuji lewat fixture HTTP. Customer tidak dibuat admin. |
| Laporan | Lolos demo | Tiga rincian pengelompokan dan ekspor CSV berisi data. PDF/XLSX belum tersedia. |
| Risiko | Tidak berlaku saat ini | Tidak ada modul risiko aktif. Lokasi contoh pada tracking bukan mesin prediksi risiko/ETA nyata. |
| Cleaner pada browser HP | Lolos simulasi | Link tugas pada 360px: tiba, mulai, validasi laporan, selesai, refresh. Laporan tanpa foto; WhatsApp tetap simulasi. |
| Loading, error, empty | Lolos melalui HTTP | Respons kosong, 503, tombol Coba lagi setelah API pulih, respons lambat, dan sesi kedaluwarsa. |
| Lebar 360/768/1280 | Lolos cakupan yang diuji | 27 kombinasi halaman admin; ditambah login dan form layanan pada tiga lebar. Tidak ada overflow horizontal pada 30 pengukuran admin/form. |
| npm run build | Lolos | [Log build](checks/build.txt). |
| README, dokumentasi render, perbandingan Figma | Disiapkan | [Render](RENDER.md), [perbandingan](FIGMA-COMPARISON.html). Referensi Figma memakai ekspor arsip, bukan klaim sinkronisasi desain live. |
| Demo aplikasi | Disiapkan | [Urutan demo](DEMO.md). |
| PPT | Dilewati | Sesuai instruksi pengguna. |

## Hasil pengujian

| Pemeriksaan | Hasil |
| --- | --- |
| Browser fungsional | 48 pemeriksaan lolos: [34 pemeriksaan utama](checks/browser-results.json) dan [14 tambahan audit/kategori](checks/browser-supplemental.json). |
| Responsif | 27 kombinasi halaman admin, 3 login, 3 form layanan; 54 screenshot bukti tersimpan. |
| Store demo | 16 kelompok lolos; [log](checks/demo.txt). |
| Audit admin | 9 kelompok lolos; [log](checks/audit.txt). |
| Kategori layanan | Skrip lolos; [log](checks/categories.txt). |
| Perhitungan promo | 4 kelompok lolos; [log](checks/promo.txt). |
| Kontrak HTTP | 13 kelompok lolos; [hasil](checks/http-results.json), [jurnal permintaan](checks/http-requests.json). |
| Backend clone + patch kategori | 36 tes lolos dengan pool database tiruan; [log](checks/backend-patched.txt). Bukan bukti MySQL tim. |
| TypeScript / build | Lolos; [TypeScript](checks/typecheck.txt), [build](checks/build.txt). Konfigurasi Next sementara QA sudah dipulihkan. |
| Format kode | [Seluruh source aplikasi dan dua skrip QA lolos](checks/format-source.txt). Perintah penuh [format:check](checks/format.txt) masih memperingatkan format `tsconfig.json` bawaan yang tidak diubah; bukan kegagalan fungsi/build. |

Angka screenshot tidak berarti seluruh piksel semua layar dibandingkan otomatis. Pemeriksaan responsif mengukur overflow, menunggu konten utama, dan menyimpan tampilan. Sampel form 360px, error 360px, jadwal 768px, serta perbandingan halaman utama ditinjau secara visual.

Pemeriksaan tambahan membuktikan filter gabungan audit, detail harga sebelum/sesudah, filter tetap setelah dialog ditutup, pencarian kosong/reset/pagination, kategori kosong menonaktifkan checklist, kategori terisi wajib persetujuan, pergantian kategori mereset persetujuan, penghapusan bersama bertahan setelah refresh, dan mutasi tercatat di audit demo. Pada frontend dengan demo nonaktif, respons audit 404 menampilkan “belum tersedia” tanpa fallback; respons 503 serta pemulihan melalui Coba lagi juga diuji. Lihat [jurnal HTTP browser utama](checks/browser-http-journal.json) dan [jurnal audit](checks/browser-audit-http-journal.json).

## Berkas pendukung

- [Galeri 54 screenshot](SCREENSHOTS.html) dan [perbandingan sembilan halaman Figma](FIGMA-COMPARISON.html).
- [Kontrak audit untuk tim backend](API-AUDIT-ADMIN.md).
- [Panduan kategori](PANDUAN-KATEGORI.md) dan [patch backend kategori](backend-kategori.patch). Patch tidak diterapkan pada server tim atau di-push otomatis.
- [CSV yang diunduh dari UI](laporan-demo.csv).
- [Validasi integritas berkas/tautan](checks/artifact-validation.json) dan [manifest SHA-256](MANIFEST.sha256). Untuk memeriksa ulang paket hasil ekstrak, jalankan `node checks/validate-evidence.mjs` dari folder ini.

## Matriks dukungan API tim

Pemetaan ini berasal dari router/controller backend pada HEAD remote di atas. “Ada” berarti rute/kontrak ada di kode, **bukan** sudah lulus uji database hidup.

| Modul / kebutuhan | Dukungan yang ditemukan | Status akhir |
| --- | --- | --- |
| Login admin | `POST /api/auth/login`, endpoint admin auth | Ada; uji dengan MySQL tim masih menunggu. |
| Kategori layanan | CRUD `/api/admin/categories` | Ada. Pilihan hapus bersama dan kategori tambahan pada layanan memerlukan patch kategori yang disediakan terpisah. |
| Layanan | CRUD `/api/services` dan `/api/admin/services` | Ada. Kontrak foto/unggah masih perlu dilengkapi; model layanan web belum menyimpan `imageUrl`. |
| FAQ | CRUD `/api/faqs` | Ada. Kategori FAQ tambahan `/categories?resource=faqs` belum ada. |
| Petugas | CRUD `/api/staff` | Ada. Field keahlian frontend `skills` belum didukung pada model/controller yang diperiksa. |
| Pesanan | GET daftar dan detail `/api/orders` | PATCH/DELETE/penugasan belum ada pada router tim. |
| Jadwal kerja | `/api/schedules` | Belum tersedia. |
| Customer admin | `/api/customers` | Belum tersedia. Endpoint autentikasi customer bukan CRUD admin customer. |
| Promo, banner, unggah | `/api/promos`, `/api/banners`, `/api/uploads` | Belum tersedia. |
| Tugas cleaner dan dispatch | `/orders/:id/cleaner-tasks`, `/cleaner-tasks`, API tugas publik | Belum tersedia. Penyimpanan dan pengiriman yang diuji masih simulasi lokal. |
| Audit admin | `/api/audit-logs` | Tabel ada, endpoint serta pencatatan mutasi belum tersedia. |
| Laporan CSV | Frontend menghitung dari orders | Berfungsi pada data uji; validasi data transaksi asli masih menunggu backend. |

**Syarat “setiap fitur yang mengubah data terhubung API” belum terpenuhi untuk produksi.** Fixture membuktikan adapter HTTP dan alur frontend, tidak menggantikan endpoint nyata. Jangan mencentang integrasi produksi sebagai selesai hanya karena UI atau demo berhasil.

## Temuan dan tindak lanjut

1. Backend perlu melengkapi endpoint pada matriks dan menyepakati field respons, terutama tugas cleaner, audit, jadwal, customer, penugasan, foto, dan keahlian petugas.
2. Jalankan ulang dengan `ADMIN_DEMO_ENABLED=false` terhadap base URL API tim dan database yang berisi data pengujian. Akun demo `admin/admin` tidak membuktikan autentikasi backend produksi.
3. Patch kategori belum di-push/deploy. Minta tim menerapkannya sebelum menguji penghapusan kategori bersama layanan pada API nyata.
4. Pengiriman WhatsApp, pembayaran, GPS/ETA, serta risiko tidak dinyatakan berfungsi nyata.
5. Akses screenshot Figma live melalui konektor ditolak karena izin file. Bukti perbandingan menggunakan ekspor tersimpan 16 Oktober 2026; perlu pemeriksaan ulang bila desain live sudah berubah.
6. Perubahan dan dokumen baru tetap lokal. Commit/push dilakukan terpisah bila diminta.

## Menjalankan ulang pemeriksaan

Dari folder `frontend`:

```powershell
npm run check:demo
npm run check:audit
npm run check:categories
npm run check:promo
npm run typecheck
npm run format:check
npm run build
```

Untuk HTTP, jalankan `npm run qa:api` pada terminal terpisah, lalu:

```powershell
$env:CLEANGO_QA_OUTPUT_DIR = 'docs/uts-2026-10-21/checks'
npm run check:uts:http
```

Fixture memakai direktori sementara. File `.env.local`, token sesi, dan penyimpanan pengguna tidak dimasukkan ke paket bukti.
