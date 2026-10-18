# Web Admin CleanGo

[Checklist terbaru 17–18 Oktober 2026](docs/checklist-review-2026-10-17/README.md): 71 pemeriksaan browser, 27 kombinasi halaman/lebar, pengujian HTTP terisolasi, dokumentasi render, dan screenshot perbandingan Figma. API tim belum diterima; hasil demo/fixture tidak membuktikan integrasi backend produksi.

[Ringkasan perubahan dan pemeriksaan 17 Oktober](docs/recheck-2026-10-17/README.md): hasil tes terbaru, perubahan tiap halaman, dan integrasi yang masih menunggu backend.

[Pemeriksaan seluruh popup terbaru](docs/popup-review-2026-10-16/README.md): ukuran sesuai isi, form dan footer konsisten, konfirmasi hapus ringkas, serta pemeriksaan desktop/HP/tablet.

[Revisi antarmuka terbaru](docs/ui-revision-2026-10-16/README.md): detail dan ubah dipisahkan; harga normal hanya di layanan, diskon/banner di Kelola Promo; customer tidak dibuat admin; Pantau per petugas; catatan Boo dan kontrol/label uji dihilangkan dari tampilan.

Web admin CleanGo untuk mengelola operasional layanan kebersihan. Dibuat dengan Next.js App Router, React, dan TypeScript.

Repositori tim: [team-T3B-Kelompok6/cleango-platform](https://github.com/team-T3B-Kelompok6/cleango-platform). Paket bukti UTS terbaru berisi [hasil pengujian, perbandingan Figma, strategi render, dan handoff backend](docs/uts-2026-10-16/README.md). Backend tim belum selesai; hasil demo dan HTTP fixture tidak membuktikan integrasi MySQL atau WhatsApp produksi.

## Fitur

- Login dan logout admin.
- Dashboard, aktivitas pesanan, notifikasi, dan panduan SOP.
- Kelola pesanan: pencarian, filter status/tanggal, detail, perubahan data, penugasan petugas, dan hapus.
- Kelola jadwal: tambah, lihat, ubah, dan hapus shift kerja petugas; menjadi acuan ketersediaan pada Tugaskan Petugas.
- Kelola layanan, FAQ, dan petugas: tambah, lihat, ubah, dan hapus.
- Tambah kategori layanan dan FAQ dari halaman pengelolaan.
- Kelola layanan: foto utama JPG/PNG, harga normal, fasilitas yang dapat ditambah/dihapus, dan status aktif.
- Kelola Promo di sebelah Tambah kategori: kode promo, diskon persen/nominal, semua atau beberapa layanan, periode, batas potongan, minimal transaksi, dan kuota pemakaian.
- Tambah Banner Promo di sebelah Tambah Promo dalam Kelola Promo untuk mengunggah gambar beranda mobile.
- Detail petugas dalam popup: profil, keahlian, tugas aktif, edit data, serta tautan WhatsApp yang bisa dibuka atau disalin.
- Kelola pelanggan: lihat, ubah, dan hapus; pendaftaran melalui aplikasi pelanggan.
- Laporan per periode dan ekspor CSV.
- Pantau Petugas: progres tugas, status pengiriman link, pratinjau halaman cleaner, salin link, dan kirim ulang.
- Halaman cleaner untuk HP: keberangkatan, konfirmasi tiba, foto bukti, laporan selesai, dan status pengiriman laporan ke customer.

Pesanan dibuat dari aplikasi pelanggan. Jadwal kerja petugas dibuat admin melalui Kelola Jadwal tanpa field customer/layanan. Penugasan memerlukan shift aktif yang mencakup tanggal dan seluruh rentang jam pesanan; petugas tidak dapat menerima pesanan lain yang bertumpuk. Halaman tugas menggunakan data penugasan; integrasi tugas dan chatbot untuk data produksi mengikuti kontrak API tim.

Seluruh tombol Detail membuka popup di atas daftar: Pesanan, Jadwal, Layanan, FAQ, Customer, dan Petugas. Detail Pesanan/Jadwal menampilkan ringkasan baca dengan tombol Ubah terpisah; Layanan, FAQ, Customer, dan Petugas menampilkan ringkasan terlebih dahulu. Perapihan font, warna, dan jarak tetap mempertahankan struktur serta alur popup dari Figma. Menutup detail mempertahankan pencarian, filter, dan pagination daftar.

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

Buka [localhost:3000](http://localhost:3000). Pada mode API, login memerlukan backend yang sudah berjalan. Akun seed backend tim: **admin@cleango.id / 321321**. Autentikasi dilakukan melalui server.

## Demo frontend tanpa backend

Untuk memeriksa tampilan, popup, filter, form, unggah foto, dan alur cleaner tanpa API tim, tambahkan pada `.env.local`:

```dotenv
ADMIN_DEMO_ENABLED=true
```

Jalankan `npm run dev`, lalu masuk dengan **admin / admin**. Mode ini tidak memanggil API tim. Kontrol dan banner pengujian disembunyikan dari tampilan admin; status pengiriman simulasi tetap ditulis secara jujur. Hanya berlaku pada development; `npm run build` / `npm run start` tetap memakai API asli.

Data awal mencakup 20 pesanan, jadwal terkait, 6 layanan dengan foto, 7 FAQ, 7 customer, 7 petugas, 4 kode promo, serta contoh gambar banner. Tiga pesanan baru **DEMO-CHECK-01 sampai 03** disiapkan dalam status Menunggu Assign; contoh **DEMO-ACTIVE-06/07** memperlihatkan perjalanan dan pengerjaan. Riwayat selesai mempunyai metode pembayaran dan nomor invoice agar laporan dapat diperiksa. Gambar contoh berasal dari aset salinan aplikasi mobile yang diberikan tim, tanpa mengubah proyek mobile.

Data disiapkan sekali dan disimpan di `.local/cleaner-demo`. Penyimpanan form, foto, penugasan, dan laporan bertahan setelah refresh/restart; membaca ulang halaman tidak menggandakan data atau menghidupkan kembali record yang dihapus. Progres tiga skenario cleaner lama dipertahankan. **Ulangi Data Uji** hanya mereset DEMO-ORD-01 sampai 03, bukan katalog, riwayat, atau tugas contoh lain. Kontak pada seed memakai nomor contoh berformat Indonesia dan email nama pada domain `example.com`; kepemilikan nomor tidak diverifikasi. Seluruh pengiriman WhatsApp untuk ID DEMO tetap simulasi, termasuk kontak yang diketik dalam form. Migrasi kontak hanya mengganti placeholder nol/email `example.test`, tanpa menimpa kontak yang sudah diedit atau mereset progres tugas.

Untuk kembali ke API tim, ubah `ADMIN_DEMO_ENABLED=false`, restart, lalu masuk kembali memakai akun backend. Mode dummy tidak menutupi keterbatasan UI yang belum diimplementasikan: profil admin lengkap, timeline aktivitas, pengelolaan banner lama, dan ekspor PDF/XLSX tetap mengikuti temuan audit. Mode ini juga bukan bukti integrasi app, pembayaran, GPS, atau WhatsApp sungguhan.

Jalankan `npm run check:demo` untuk memeriksa data dan mutasi di direktori sementara, tanpa mengubah progres demo yang sedang dipakai. Catatan pengujian browser tersedia pada [pemeriksaan mode demo](docs/admin-demo-2026-10-16/README.md).

## Mencoba alur cleaner

Aktifkan `CLEANER_DEMO_ENABLED=true` di `.env.local`, lalu jalankan frontend dengan API preview atau API tim yang sudah mendukung autentikasi admin. Di Kelola Pesanan, klik **Siapkan 3 Pesanan Uji**. Penanda `[UJI]` membedakan data ini dari pesanan biasa. Tombol tersebut aman diklik lagi tanpa menggandakan data atau mereset progres.

1. Tugaskan petugas `[UJI]` pada salah satu pesanan `DEMO-ORD-01` sampai `03`.
2. Buka **Pantau Petugas → Buka Halaman Petugas**. Halaman cleaner tampil dalam popup yang sama. **Salin Link** dipakai untuk membuka tugas langsung di tab lain/HP; kolom link juga bisa dipilih dan disalin manual.
3. Tekan **Berangkat Sekarang**, lalu **Saya Sudah Tiba & Mulai Pengerjaan**. Status dan waktunya tersimpan di server; refresh tidak mengulang tugas.
4. Foto bersifat opsional, maksimal tiga JPG/PNG berukuran 2 MB per foto. Isi ringkasan minimal 10 karakter dan konfirmasi pemeriksaan, lalu tekan **Selesai & Kirim Laporan ke WA**.
5. Status pekerjaan dan pengiriman laporan ditampilkan terpisah. Bila pengiriman gagal, laporan tetap tersimpan dan tombol **Kirim Ulang Laporan** tersedia.

Pesanan 01 menguji alur sukses. Pesanan 02 sengaja gagal mengirim link pada percobaan pertama. Pesanan 03 sengaja gagal mengirim laporan pertama. Seluruh pengiriman data `[UJI]` selalu simulasi dan tidak pernah menghubungi nomor sungguhan. Label **Simulasi Berhasil** berbeda dari **Terkirim**. **Ulangi Data Uji** mengembalikan tiga pesanan ke Menunggu Assign serta membatalkan seluruh link/foto tugas uji lama, tanpa menyentuh data API tim.

Data uji, foto, dan kunci penandatanganan link tersimpan di `frontend/.local/cleaner-demo`, yang diabaikan Git. Penyimpanan tetap ada setelah refresh/restart. `CLEANER_DEMO_DATA_DIR` dapat menunjuk direktori absolut lain yang dapat ditulis server. Jalankan mode uji ini pada satu proses frontend dan satu disk lokal; penyimpanan JSON bukan pengganti database produksi atau penyimpanan bersama untuk banyak server. Permintaan dalam proses tersebut diserialkan, termasuk saat development reload. Mode uji default nonaktif pada `.env.example`.

Untuk mencoba dari HP pada Wi-Fi yang sama, jalankan `npm run dev:lan`, lalu buka alamat IP LAN komputer pada port 3000. Isi `APP_PUBLIC_URL=http://<IP-komputer>:3000` agar **Salin Link** menghasilkan alamat yang bisa diakses HP; restart setelah mengubah environment. Link `localhost`/`127.0.0.1` hanya membuka komputer itu sendiri. GPS sungguhan membutuhkan HTTPS atau konteks aman; simulasi GPS tetap tersedia pada data uji. Tidak perlu login admin untuk membuka link tugas yang sah. Link hanya memberi akses ke satu penugasan, berlaku tujuh hari pada mode uji, dan dicabut bila penugasan dibatalkan/diganti.

Integrasi pengiriman sungguhan belum tersedia pada API tim yang diperiksa. Adapter frontend dan kontraknya ada di [API-CONTRACT.md](docs/API-CONTRACT.md#halaman-tugas-cleaner-dan-dispatch). Backend perlu menyimpan tugas/laporan, memverifikasi token, dan mengirim melalui chatbot/provider. Draf manual `wa.me` disiapkan dari data tugas yang sudah tersimpan, memakai nomor customer untuk laporan dan nomor petugas untuk link penugasan. Pengguna tetap menekan kirim di WhatsApp; membuka draf tidak dihitung sebagai terkirim. Pada mode manual, foto dilampirkan sendiri bila diperlukan. Bukti pemeriksaan ada di [pengujian alur cleaner](docs/cleaner-workflow-2026-10-15/README.md).

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

Pemeriksaan terbaru memakai demo development serta fixture HTTP terisolasi. Backend Express tim belum selesai menurut konfirmasi pengguna; beberapa endpoint dan field masih perlu disamakan sebelum pengujian bersama MySQL/MariaDB dan aplikasi mobile. Hasil terbaru mencakup 28 kasus UI demo, 27 kombinasi halaman/lebar, 13 kelompok HTTP, serta 9 kelompok store demo. Loading/empty diuji di browser; 401/503/slow/recovery diuji di data layer HTTP. Uji pada HP fisik dan runtime error dengan API tim masih perlu dilakukan.

Pengelolaan kode promo memerlukan endpoint `/promos` dari backend. Contoh perhitungan di form membantu memeriksa konfigurasi; penerapan kode, pengecekan kuota, dan penghitungan pembayaran di checkout tetap dilakukan backend dan aplikasi mobile.

- [Paket UTS dan bukti terbaru 16 Oktober 2026](docs/uts-2026-10-16/README.md)
- [Hasil build terbaru](docs/uts-2026-10-16/build.txt)
- [Pengujian fitur admin](docs/admin-actions/README.md)
- [Pengujian ulang enam menu admin 15 Oktober 2026](docs/admin-actions/AUDIT-2026-10-15.md)
- [Perapian tampilan dan konsistensi style 15 Oktober 2026](docs/visual-polish-2026-10-15/README.md)
- [Pengelolaan kode promo dan perbaikan kalender 15 Oktober 2026](docs/promo-management-2026-10-15/README.md)
- [Pemeriksaan menyeluruh dan perbaikan kasus gagal 15 Oktober 2026](docs/final-audit-2026-10-15/README.md)
- [Hasil pengecekan 11 Oktober 2026](docs/admin-actions/AUDIT-2026-10-11.md)
- [Revisi logo, kategori, promo, dan form 13 Oktober 2026](docs/admin-actions/REVISION-2026-10-13.md)
- [Pemeriksaan tampilan seluruh halaman 14 Oktober 2026](docs/visual-audit-2026-10-13/AUDIT-2026-10-14.md)
- [Penyesuaian font dan jarak teks 14 Oktober 2026](docs/typography-2026-10-14/README.md)
- [Revisi form layanan dan pemeriksaan konsistensi](docs/service-editor-2026-10-14/README.md)
- [Kecocokan web admin, mobile, dan API tim](docs/app-compatibility-2026-10-14/README.md)
- [Pengujian tracking](docs/tracking/qa.json)

## Desain dan screenshot

Desain mengikuti prototype [Figma CleanGo fix](https://www.figma.com/design/1lr9CMyydP3dI6axuKAUg6/CleanGo-fix?node-id=4002-7854). Ukuran disesuaikan secara visual dan masih dapat berubah mengikuti desain final.

Perbandingan sembilan halaman dan popup terbaru tersedia pada [perbandingan Figma 16 Oktober 2026](docs/uts-2026-10-16/FIGMA-COMPARISON.md), termasuk daftar bagian yang belum lengkap. Tabel di bawah disimpan sebagai riwayat screenshot 13 Oktober.

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
