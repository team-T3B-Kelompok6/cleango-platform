# Audit desain Cleango per halaman

Tanggal: 8 Oktober 2026. Lingkup: frontend saja.

Referensi terbaru yang berhasil dibuka: [prototype Cleango](https://www.figma.com/proto/ymMzgCxXWLUncDBzi1e4Oq/Cleango?node-id=139-2). PRD: [../../../CLEANGO-PRD.md](../../../CLEANGO-PRD.md).

## Status akses dan batas pemeriksaan

Link prototype merender sembilan halaman dashboard admin. Bukti tangkapan layar tersimpan di figma-prototype/ dan hasil akses di [access-report.json](figma-prototype/access-report.json). Link Design/Dev Mode masih mendapat 403; get_design_context melalui plugin masih terkena batas panggilan Figma MCP Starter.

Revisi frontend sembilan halaman telah dilakukan berurutan memakai skill `figma-design-to-code`, PRD dan ketentuan dosen. Acuan visual adalah prototype yang berhasil dibuka, dengan komponen/token/aset SVG proyek yang sudah tersedia. Ini **pemeriksaan visual terhadap bagian yang terlihat**, bukan verifikasi pixel-perfect. Screenshot prototype mencakup viewer, margin hitam, banner cookie dan pesan browser; beberapa frame panjang terpotong di bawah viewport. Screenshot web terbaru ada di `revised/` dan diambil dari build produksi dengan fixture HTTP di luar aplikasi.

Layer/token dan ekspor aset dari revisi terbaru belum dapat diakses melalui MCP. Screenshot desain hanya dipakai sebagai referensi, tidak menjadi aset implementasi. Ikon SVG asli proyek tetap lokal; tambahan ikon memakai komponen SVG. Panda SVG mengikuti larangan emoji dalam tugas dosen. Seluruh gambar yang terlihat diperiksa berhasil dimuat dan geometri rendernya dicatat di [QA interaksi/aset](revised/revision-interactions.json).

## Pembandingan awal dan urutan revisi

| Urutan | Halaman        | Frame    | Referensi terkini                          | Web sebelumnya                        | Temuan awal                                                                                                                                                                                                                           |
| ------ | -------------- | -------- | ------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1      | Login          | `328:2`  | [Prototype](figma-prototype/login.png)     | [Web](screenshots/login-1280.png)     | Susunan dasar sudah ada. Bentuk panda berbeda, tipografi teks pendukung dan label perlu dicocokkan. Hilangnya lupa kata sandi dan penggunaan username admin tetap mengikuti keputusan pengguna.                                       |
| 2      | Dashboard      | `327:2`  | [Prototype](figma-prototype/dashboard.png) | [Web](screenshots/dashboard-1280.png) | Label statistik harian, teks pembaruan, spacing aktivitas, tautan Lihat Semua dan susunan footer perlu dicocokkan. Angka/data fixture tidak dinilai sebagai perbedaan desain.                                                         |
| 3      | Kelola pesanan | `329:2`  | [Prototype](figma-prototype/pesanan.png)   | [Web](screenshots/pesanan-1280.png)   | Jarak statistik ke tab dan tab ke daftar lebih besar di web; kartu web memiliki tombol Lihat Detail tambahan. Ikon, susunan lokasi/layanan/harga dan hierarki tombol perlu dicocokkan. Dynamic route detail tetap dibutuhkan tugas.   |
| 4      | Jadwal         | `330:2`  | [Prototype](figma-prototype/jadwal.png)    | [Web](screenshots/jadwal-1280.png)    | Prototype menampilkan rentang jam pada heading shift, ringkasan jadwal belum fix, lokasi pada kartu, serta kartu slot tersedia. Web belum memiliki komposisi yang sama.                                                               |
| 5      | Layanan        | `331:2`  | [Prototype](figma-prototype/layanan.png)   | [Web](screenshots/layanan-1280.png)   | Chip fasilitas di web lebih tinggi dengan ikon di atas teks; target memakai chip horizontal. Badge paket, ikon statistik, label dan gaya tombol edit berbeda.                                                                         |
| 6      | Petugas        | `332:2`  | [Prototype](figma-prototype/petugas.png)   | [Web](screenshots/petugas-1280.png)   | Web memakai kartu lebih tinggi dengan tiga tombol vertikal. Target memiliki badge status, rating dan chip keahlian, serta dua aksi. Data rating/keahlian harus bersumber dari API, bukan angka karangan.                              |
| 7      | Customer       | `333:2`  | [Prototype](figma-prototype/customer.png)  | [Web](screenshots/customer-1280.png)  | Target menampilkan tanggal bergabung dan chip ringkasan transaksi. Web masih memakai kartu generik dengan tombol edit tambahan. Statistik target memiliki kartu retensi yang tampak terduplikasi; perlu dicatat sebelum implementasi. |
| 8      | Laporan        | `334:2`  | [Prototype](figma-prototype/laporan.png)   | [Web](screenshots/laporan-1280.png)   | Target memiliki panel grafik berdampingan dengan metode pembayaran, tab laporan dan aksi Lihat Invoice. Web menampilkan grafik selebar konten tanpa panel/tab tersebut. Kontrak data pembayaran/invoice diperlukan.                   |
| 9      | FAQ            | `548:58` | [Prototype](figma-prototype/faq.png)       | [Web](screenshots/faq-1280.png)       | Target menampilkan kartu Paling Sering Dibaca, tab hijau, teks waktu diperbarui dan ikon edit/hapus per baris. Web menampilkan FAQ Draft, tab gelap dan aksi detail yang berbeda.                                                     |

## Kriteria selesai per halaman

1. Peroleh konteks frame, token dan aset sesuai revisi terbaru; gunakan komponen dan token proyek yang cocok.
2. Cocokkan font, ukuran teks, warna, spacing, susunan komponen dan setiap aset statis. Nilai statistik/nama/datum mengikuti API dan dapat berbeda dari contoh Figma.
3. Pertahankan RSC untuk data awal dan komponen client kecil untuk interaksi. Data bisnis tetap berasal dari API.
4. Pertahankan keputusan pengguna: tanpa lupa kata sandi; akun admin/admin dari backend; animasi popup turun; lebar halaman stabil antar filter; footer dialog tetap; detail pesanan melebar; SOP berukuran konsisten dan Ringkasan tanpa scroll.
5. Uji 360×800, 768×1024, 1280×820 dan landscape 800×360, beserta loading/kosong/error, fokus keyboard, tombol dan reduced motion.
6. Lampirkan bukti Figma dan web dengan viewport sepadan setelah revisi. Catat keterbatasan dan selesaikan halaman sebelum berpindah ke halaman berikutnya.

## Bukti frontend sebelumnya

- [QA responsif](screenshots/initial-qa.json): tidak ditemukan overflow halaman pada pengujian sebelumnya.
- [QA alur](screenshots/flow-qa.json): 18 pemeriksaan lolos, 0 gagal dengan fixture di luar aplikasi, termasuk tab, popup, footer, SOP, CRUD dan navigasi.
- [Build](build-output.txt): bukti kompilasi, bukan bukti kemiripan visual.

## Hasil revisi

| Halaman   | Perbaikan                                                                                                                                                | Bukti web terbaru                         |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Login     | Ukuran panda, label, teks pendukung, spacing input, tombol dengan panah. Tanpa lupa sandi sesuai keputusan pengguna.                                     | [Desktop](revised/login-1280x820.png)     |
| Dashboard | Ringkasan benar-benar harian, tanggal dinamis, kartu aktivitas ringkas, susunan header/footer dan tautan semua pesanan.                                  | [Desktop](revised/dashboard-1280x820.png) |
| Pesanan   | Jarak tab/daftar, lokasi/layanan/harga, ID sebagai link detail, menu opsi, ikon penugasan. Lebar tetap untuk semua tab.                                  | [Desktop](revised/pesanan-1280x820.png)   |
| Jadwal    | Ringkasan operasional, dua kolom per shift, badge jumlah, alamat bila tersedia, kartu tambah jadwal. Tidak mengklaim slot tersedia tanpa data kapasitas. | [Desktop](revised/jadwal-1280x820.png)    |
| Layanan   | Chip fasilitas horizontal, badge kategori/paket, harga dan caption, tombol edit teks dengan ikon. Favorit tampil kosong jika API belum menyediakannya.   | [Desktop](revised/layanan-1280x820.png)   |
| Petugas   | Kartu 150px minimum responsif, badge status, dua aksi; rating/keahlian opsional dari API. Detail memuat jadwal penugasan terkait.                        | [Desktop](revised/petugas-1280x820.png)   |
| Customer  | Kartu ringkas, tanggal bergabung, chip jumlah/total pesanan, WhatsApp dan detail. Detail memuat riwayat pesanan.                                         | [Desktop](revised/customer-1280x820.png)  |
| Laporan   | Grafik dan metode pembayaran berdampingan, pemilih bulan popup, ekspor CSV, empat tab laporan dengan hasil agregasi dari API.                            | [Desktop](revised/laporan-1280x820.png)   |
| FAQ       | Kartu pembaca, tab hijau, kategori berwarna, edit/hapus bisa diakses tanpa membuka jawaban, waktu pembaruan opsional dari API.                           | [Desktop](revised/faq-1280x820.png)       |

Kartu retensi yang terduplikasi di prototype customer diganti dengan total transaksi selesai yang dapat dihitung. Invoice belum menjadi dokumen pembayaran: tombol tetap **Lihat Rincian** sampai kontrak invoice nyata tersedia. Statistik pembaca, favorit, rating, keahlian dan metode pembayaran tidak diisi angka rekaan di frontend.

- [36 pemeriksaan responsif](revised/login-dashboard-pesanan-jadwal-layanan-petugas-customer-laporan-faq-qa.json): 9 halaman pada 1280×820, 768×1024, 360×800 dan 800×360; tanpa overflow halaman atau page error.
- [18 uji alur](revised/flow-qa.json): filter, ukuran tab, footer dialog, penugasan, SOP, CRUD, validasi, 404, kosong/error, ekspor, navigasi dan sesi.
- [9 pemeriksaan tambahan](revised/revision-interactions.json): riwayat petugas/customer, periode/empat tab laporan, FAQ tertutup, animasi tanggal/notifikasi, akun, fokus Escape, field opsional API dan gambar lokal.
- [Build produksi](build-output.txt), TypeScript dan Prettier berhasil. Error React pada simulasi API 503 dicatat sebagai error yang sengaja dipicu untuk menguji error boundary; bukan hasil halaman normal.
- [Log pemeriksaan](checks-output.txt) dan [ringkasan akhir](revised/final-evidence.json). Sisa nilai font/padding/margin literal di stylesheet lama dikonsolidasikan menjadi token CSS tanpa mengubah nilainya.

Pemeriksaan di atas memakai fixture sementara, **belum membuktikan integrasi Express/database**. Tim perlu menjalankan ulang uji dengan backend sebenarnya, serta mencocokkan layer/token/aset terbaru saat akses Figma tersedia. Ukuran viewport acuan prototype 1280px di dalam viewer; margin viewer dan tinggi halaman berbeda sehingga tidak dilakukan pengukuran selisih piksel.

## Tracking dummy dan penyederhanaan visual

Permintaan pengguna berikutnya menambahkan preview tracking dummy serta polesan agar desain lebih natural. Konfigurasi setup-matt-pocock-skills di AGENTS.md/docs/agents/ tetap diikuti. Skill desain tetap figma-design-to-code, dengan prototype petugas sebagai acuan gaya; panggilan konteks node 332:2 masih terkena batas quota MCP.

Tambahan tracking menggunakan dialog dua kolom, roster horizontal di layar kecil, peta Leaflet, status lokasi terlambat, detail tugas dan timeline. Footer tetap di luar body scroll; perpindahan pilihan/peta singkat dan mendukung reduced motion. Simulasi diberi label terlihat, tidak mengubah data pesanan/API. Warna/font/layout utama dipertahankan. Menu aktif tanpa glow, kartu statistik tanpa bayangan bergerak dan keterangan statistik tanpa pill dekoratif.

- [Panduan/batas tracking](TRACKING.md).
- [QA tracking](tracking/qa.json) dan [QA error/keyboard](tracking/extra-qa.json).
- [Desktop](tracking/tracking-1280x820.png), [ponsel](tracking/tracking-360x800.png); screenshot memakai tile SVG fixture untuk QA, bukan peta geografis aktual.
- [Build tracking](tracking-build.txt) dan [TypeScript/Prettier](tracking-checks.txt).
- Screenshot serta 36 pemeriksaan halaman di revised/ diperbarui setelah polesan global; tidak ada overflow/page error.

Tracking adalah UX baru, bukan frame baru yang tersedia di Figma. Skenario dummy merupakan pengecualian preview yang diminta pengguna, tercatat di PRD; bukan klaim pemenuhan data API pada tugas dosen.
