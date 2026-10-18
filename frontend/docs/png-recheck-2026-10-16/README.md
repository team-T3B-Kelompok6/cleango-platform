# Pemeriksaan ulang dari PNG Figma — 16 Oktober 2026

> Catatan historis: audit ini memakai fixture lama port 4400. Pemeriksaan terbaru dan status perbaikan ada pada [paket UTS](../uts-2026-10-16/README.md). Daftar pesanan pada demo terbaru sudah dapat dibuka, dan definisi jam shift daftar/editor sudah disatukan. Gap desain lain tetap dicatat; jangan menganggap error fixture lama sebagai kondisi backend tim.

**Hasil: frontend belum dapat dinyatakan selesai sesuai seluruh desain.** Build berhasil dan sebagian besar menu dapat dibuka, tetapi masih ada satu penghalang demo pada daftar pesanan serta sejumlah popup/fitur yang belum lengkap.

Pemeriksaan ini melanjutkan [audit pertama](../figma-comparison-2026-10-16/README.md), dengan membaca PNG asli berukuran **25.632 × 14.600** untuk admin dan **15.168 × 10.739** untuk mobile. Potongan pada folder `reference` dibuat untuk membaca detail; bukan aset yang dipasang sebagai tampilan aplikasi. Sumber berasal dari dua lampiran PNG pengguna. Frame utama pada audit pertama tetap dipakai sebagai pembanding halaman.

Web yang diperiksa adalah preview lokal pada port 3000, dengan API fixture port 4400. Salinan mobile di `C:/Users/athlon/Documents/CleanGo-app-main` dibaca sebagai referensi integrasi. Kondisi ini tidak membuktikan kesiapan backend atau repo mobile terbaru milik tim.

Tidak ada perubahan kode aplikasi, reset pesanan uji, penyimpanan form CRUD, pengiriman WhatsApp, atau perubahan backend/mobile pada audit ini. Tes penyimpanan cleaner memakai direktori sementara, sedangkan tes adapter memakai transport dalam memori.

## Urutan pengerjaan untuk persiapan demo

| Urutan | Pekerjaan | Alasan |
| --- | --- | --- |
| 1 | Pulihkan daftar pesanan tanpa pencarian dan tautan detail dari dashboard/notifikasi. | Saat ini halaman error pada preview; pencarian hanya melewati record rusak, bukan penyelesaian masalah. |
| 2 | Hubungkan pengelolaan banner lama pada popup yang diakses dari tombol banner yang sekarang. | Tambah tersedia, tetapi pengguna belum punya jalan untuk memilih dan mengganti/menghapus banner yang sudah disimpan. Tidak perlu mengembalikan menu Promo Beranda. |
| 3 | Samakan definisi jam shift dan pisahkan status jadwal dari kesiapan pekerja. | Daftar dan editor menggunakan jam berbeda. Figma sendiri juga tidak konsisten pada bagian ini. |
| 4 | Lengkapi popup penugasan, FAQ, customer, petugas, aktivitas, serta profil admin berdasarkan PNG. | Beberapa masih form umum atau menu pendek; sejumlah kontrol yang terlihat pada PNG belum tersedia. |
| 5 | Lengkapi detail layanan dan tampilan invoice/ekspor. | Ringkasan sekarang belum mencakup detail yang terlihat di desain. |
| 6 | Uji bersama tim memakai API dan data yang sama. | Sinkronisasi mobile, pembayaran, notifikasi, GPS, dan WA belum dapat dibuktikan lewat fixture. |

## Temuan baru dari PNG

### 1. Profil admin belum dibuat seperti desain

PNG menampilkan popup profil: identitas/kontak, nama lengkap, peran, cabang, tanggal bergabung, ringkasan kinerja, Ubah Profil, Ganti Kata Sandi, preferensi notifikasi, dan Simpan Perubahan.

Web baru menampilkan popover berisi nama tetap, teks portal manajemen, dan Keluar Akun. Ini **kekurangan UI dan integrasi akun**, bukan sekadar field kosong. Data profil harus berasal dari sesi/API. Statistik kinerja dan label terverifikasi tidak boleh diisi angka contoh seolah nyata. Ganti kata sandi memerlukan alur backend yang disepakati.

[PNG profil admin](reference/admin-profile.png) · [Web saat ini](web/admin-profile.jpg). Kode: `app/(admin)/layout.tsx:64`.

### 2. Ringkasan aktivitas belum mempunyai popup riwayat

PNG mempunyai **Ringkasan Aktivitas Pesanan**, berisi ringkasan jadwal/kru/biaya dan timeline masuk → pembayaran terverifikasi → penugasan → kirim link → tiba/mulai, lengkap dengan waktu kejadian.

Baris dashboard saat ini langsung mengarah ke detail/edit pesanan. Popup timeline khusus tersebut belum tersedia. Saat diuji pada preview, klik baris CL-8923 juga berakhir pada error daftar pesanan karena data fixture yang rusak. Riwayat pembayaran dan waktu kejadian perlu sumber data yang sah; tidak cukup menurunkan semuanya dari status terakhir.

[PNG aktivitas](reference/activity.png) · [Hasil klik di web](web/activity-entry.jpg). Kode: `app/(admin)/page.tsx:102`.

### 3. FAQ: urutan tampil dan bentuk editor belum lengkap

**Urutan Tampil / Prioritas** pada PNG editor belum ada di konfigurasi field atau form. Penghitung karakter juga belum ada. Kategori dan status publikasi sudah berfungsi sebagai pilihan, tetapi bentuknya dropdown dalam form dua kolom; acuan menggunakan susunan vertikal, pilihan kategori, dan kontrol status yang lebih jelas.

Create/read/update/delete dan popup pratinjau sudah tersedia. Verifikasi Tim QC belum mempunyai alur/data. Jumlah pembaca dan waktu pembaruan sudah didukung komponen, tetapi belum diisi fixture. Pagination baru angka halaman, belum Sebelumnya/Selanjutnya.

[PNG tambah FAQ](reference/faq-add.png) · [PNG edit FAQ](reference/faq-edit.png) · [Web tambah](web/faq-add.jpg) · [Web edit](web/faq-edit.jpg) · [Web detail](web/faq-detail.jpg). Kode: `lib/resources.ts:172`.

### 4. Customer: form belum memuat beberapa data pada PNG

PNG tambah customer memuat tipe **Reguler / VIP / Bisnis**, wilayah/posko, catatan khusus/preferensi, serta indikasi verifikasi WA. Web baru mempunyai nama, nomor, email, alamat, tanggal bergabung, dan aktif/nonaktif.

**Koreksi terhadap audit pertama:** catatan khusus bukan hanya kosong di sampel data; kolom untuk mengisinya juga belum ada pada form tambah/edit. Popup detail sudah menyediakan tempat menampilkan catatan. Tipe customer dan catatan perlu kontrak penyimpanan API. Label nomor terverifikasi dan welcome reward 10% pada desain memerlukan proses verifikasi/aturan promo; jangan ditampilkan sebagai hasil nyata tanpa implementasinya.

[PNG tambah customer](reference/customer-add.png) · [Web tambah customer](web/customer-add.jpg). Kode: `lib/resources.ts:152`.

### 5. Petugas: editor masih form umum

Form edit belum memiliki ringkasan identitas/kinerja di atas, chips keahlian/sertifikasi, catatan operasional, serta pilihan izin/libur seperti PNG. Keahlian sudah dapat diisi beberapa baris; jadi kemampuan memasukkan beberapa keahlian sudah ada, sedangkan tampilan chips dan informasi sertifikasi belum ada.

Detail petugas sudah popup, mempunyai tugas aktif, jadwal, WhatsApp dan salin link. Indikator Kehadiran & Fisik pada desain masih diganti Jadwal Tercatat, sehingga maknanya berbeda. Rating, tanggal bergabung dan statistik lain tetap memerlukan data.

Area/wilayah **tidak dimasukkan kembali sebagai pengganti keahlian**, karena pengguna sebelumnya meminta perubahan field tersebut. Posko operasional, bila tetap dibutuhkan tim, perlu dibahas sebagai data terpisah.

[PNG tambah petugas](reference/staff-add.png) · [PNG edit petugas](reference/staff-edit.png) · [Web tambah](web/staff-add.jpg) · [Web edit](web/staff-edit.jpg). Kode: `lib/resources.ts:122`.

### 6. Notifikasi belum menjadi riwayat kejadian yang tersimpan

PNG menampilkan kategori Semua/Pesanan/Petugas, waktu relatif, rincian kejadian, dan aksi penugasan. Web menampilkan delapan order pertama sebagai daftar notifikasi, dengan filter Semua/Belum Dibaca. Belum ada kategori Petugas atau event notifikasi tersendiri.

Tes browser: **8 belum dibaca → Tandai semua dibaca → 0 → refresh → kembali 8**. Status baca hanya disimpan pada state komponen. Record fixture order yang rusak juga muncul sebagai notifikasi tanpa judul/customer. Penyimpanan status baca dan sumber kejadian perlu dilengkapi; data fixture harus divalidasi sebelum dirender.

[PNG notifikasi](reference/notifications.png) · [Web notifikasi](web/notifications.jpg). Kode: `components/Notifications.tsx:10` dan `:14`.

### 7. Banner: tambah ada, akses edit/hapus belum terhubung

`AddBannerButton` selalu membuka `<BannerForm />` tanpa banner lama. Fungsi `listBanners`, PATCH banner dan delete banner sudah ada, tetapi belum dipanggil dari UI daftar/pemilihan banner. Akibatnya kemampuan mengganti banner yang diminta pengguna belum bisa dijangkau melalui tampilan sekarang.

Pengelolaan ini dapat tetap berada dalam popup dari tombol **Tambah Banner Promo** di samping Tambah Layanan Baru. Tidak perlu menambah kembali halaman/tab Promo Beranda yang sudah diminta dihapus.

[Web tambah banner](web/banner-add.jpg). Kode: `components/AddBannerButton.tsx:12`, `lib/banners.ts`, `app/banner-actions.ts`.

### 8. Login gagal belum memakai popup pada PNG

PNG memuat popup Kata Sandi Salah, coba lagi, dan kirim OTP. Web menampilkan error inline di form; pemulihan sandi/OTP belum tersedia. Ini perbedaan alur/tampilan yang masih perlu diputuskan untuk kesesuaian desain. Backend harus menyediakan OTP/reset jika fitur itu dikerjakan. Tidak dilakukan perubahan kredensial atau pengiriman OTP pada audit ini.

[PNG login gagal](reference/login-error.png) · [Web login](web/login.jpg).

## Temuan audit pertama yang masih berlaku

| Bagian | Yang masih kurang | Pembagian pekerjaan |
| --- | --- | --- |
| Pesanan | Popup penugasan masih checkbox nama; belum kartu foto, rating, spesialisasi, jarak dan rekomendasi. Slot jam masih teks bebas. | Komposisi UI frontend; rating/lokasi/rekomendasi/notifikasi memerlukan API. |
| Jadwal | Kapasitas slot, kuota, kesiapan pekerja, serta pindah pesanan antarshift belum ada. Daftar memakai 08.00–11.30 / 12.00–15.30 / 16.00–19.30; editor memakai 08.00–12.00 / 13.00–17.00 / 18.00–21.00. | Satu definisi waktu di frontend, lalu model shift/kuota yang sama di backend. Create jadwal tetap tidak ditambahkan. |
| Layanan | Editor foto/tarif/promo/fasilitas sudah ada. Detail belum dua kolom, belum Preview HP, ulasan, rating/popularitas, jumlah dipesan, tenaga kru dan statistik layanan. Fasilitas editor masih satu teks per baris. | Layout dan kontrol frontend; ulasan/metrik perlu data. Foto kosong pada sampel berarti belum diisi, bukan fitur upload hilang. |
| Laporan | Invoice masih customer/alamat/layanan/total sederhana; belum rincian item, add-on, voucher, pembayaran, waktu terbit, cetak dan kirim ulang WA. Unduhan hanya CSV. | Invoice dan dialog PDF/XLSX/CSV di frontend; rincian pembayaran/biaya/bagi hasil dari backend. |
| Periode laporan | Masih input bulan bawaan browser. Belum pemilihan tahun/bulan, pintasan bulan lalu/kuartal/YTD, dan ringkasan estimasi pada panel Figma. | UI dan query periode frontend; dukungan agregasi API. |
| Pendapatan | Perhitungan sekarang memilih order berstatus Selesai; belum memeriksa sudah lunas, sedangkan PNG menyebut Selesai dan Lunas. | Sepakati payment status/snapshot transaksi dengan backend. Jangan menganggap penyelesaian pekerjaan sebagai bukti pembayaran. |
| Kalender | Hitungan tanggal/rentang tersedia; rincian sesi pagi/siang/sore per tanggal belum ada. | Agregasi berdasarkan definisi shift yang disepakati. |
| SOP | Popup tersedia, tab sekarang berdasarkan tahap kerja. Belum kategori jenis layanan, versi, dan unduh PDF resmi. | UI frontend dan dokumen SOP resmi dari tim. |
| Dashboard/style | Kartu dan baris lebih tinggi, sebagian badge/aksen serta panel lingkungan sidebar tidak dipakai. | Rapikan kepadatan sambil mempertahankan font yang terbaca dan gaya tenang sesuai revisi pengguna. |

Pembanding halaman/popup lengkap ada pada [audit pertama](../figma-comparison-2026-10-16/README.md). Contoh terbaru: [detail layanan](web/service-detail.jpg), [editor shift](web/schedule-edit.jpg), [periode laporan](web/report-period.jpg), [form layanan baru](web/service-add.jpg). Acuan tambahan: [PNG layanan baru](reference/service-add.png), [PNG periode laporan](reference/month-picker.png), [PNG konfirmasi hapus](reference/delete-confirmation.png).

## Penghalang demo: data pesanan pada fixture

Daftar `/pesanan` tanpa filter dan detail dari dashboard masih menampilkan **Data belum bisa dimuat**. Record `ORDERS-106` sampai `ORDERS-111` tidak mempunyai struktur order lengkap. `components/OrderList.tsx:53` langsung memanggil `order.staff.join(...)`, sehingga satu record yang salah menjatuhkan seluruh daftar.

Fixture di luar aplikasi mengabaikan segmen URL tambahan. POST dispatch `/orders/:id/cleaner-tasks` dapat diperlakukan sebagai create order dan memasukkan payload kirim ulang ke daftar orders. Bentuk record rusak konsisten dengan kondisi tersebut. Dispatch tidak dijalankan ulang untuk mereproduksi kerusakan pada audit ini. Tidak disimpulkan bahwa backend tim melakukan hal yang sama.

Perbaikan yang dibutuhkan adalah pencocokan route fixture yang benar, validasi DTO order, dan pemeriksaan respons/dukungan dispatch. Pencarian `CL-89` masih membuka data valid untuk pemeriksaan, tetapi default halaman tetap harus dipulihkan sebelum demo. Data yang sudah ada tidak dihapus pada audit ini.

[Error halaman pesanan](web/orders-error.jpg) · [Daftar dengan pencarian](web/orders-filtered.jpg).

## Halaman cleaner dan kecocokan dengan mobile

**Yang diuji ulang:** task `[UJI] DEMO-ORD-01` yang sudah ditugaskan dapat dibuka dalam modal admin. Link yang sama membuka halaman penuh dengan order/petugas yang benar dan tanpa navigasi dashboard admin. Pada lebar 390 px, tidak ada overflow horizontal dan tombol Berangkat Sekarang berada dalam viewport. Refresh mempertahankan tahap Siap Berangkat. Tidak ada tindakan berangkat/selesai, pengiriman, atau reset pada task milik pengguna dalam audit ini.

[PNG awal cleaner](reference/cleaner-start.png) · [PNG pengerjaan cleaner](reference/cleaner-working.png) · [Web cleaner HP](web/cleaner-phone.jpg) · [Hasil pemeriksaan baca](cleaner-read-check.json).

Persistensi perubahan tahap, pencabutan link, laporan, kegagalan pengiriman, retry, serta validasi penerima diuji ulang secara terisolasi: **11 kelompok penyimpanan + 8 kelompok adapter lolos**. Hasil ini tidak sama dengan tes provider WA atau HP fisik.

**Yang belum menjadi integrasi nyata:** live map/rute/ETA, deteksi tiba otomatis, update customer mobile, rangkaian pesan WA, dan pengiriman foto bukti sebagai media otomatis ke WA. Draf WA manual saat ini mengharuskan pengguna menekan kirim dan melampirkan foto sendiri bila diperlukan. Status simulasi tetap dibedakan dari Terkirim.

Link preview saat ini ber-origin `127.0.0.1`; untuk tes HP fisik perlu server yang dapat diakses HP dan `APP_PUBLIC_URL` yang tepat. Panduan `dev:lan`, Wi-Fi dan kebutuhan HTTPS GPS sudah ada di README frontend. Tidak mengubah binding jaringan atau membuka layanan publik pada audit ini.

Salinan Flutter yang diberikan masih memakai data lokal untuk banner, kategori dan layanan. `api_client.dart` belum berisi implementasi; kode checkout masih menetapkan `CLEANHEMAT` dan 35% secara tetap. Karena itu perubahan banner/foto/promo/FAQ dari admin **belum bisa dinyatakan tersinkron ke app**. Bagian mobile tetap milik rekan pengguna, tidak diubah.

| Data admin | Acuan mobile | Yang harus diuji bersama |
| --- | --- | --- |
| Gambar banner | [Beranda](reference/mobile-home.png) | Gambar dari admin mengganti sumber banner app setelah refresh. |
| Foto, nama, harga efektif, deskripsi, fasilitas | [Detail layanan](reference/mobile-service-detail.png) | Daftar, detail, booking dan admin membaca ID/record layanan yang sama. |
| Kode promo/cakupan/masa berlaku | [Checkout](reference/mobile-checkout.png) | Validasi di backend dan penerapan pada checkout; kuota dan penggabungan harga promo sesuai aturan. |
| FAQ aktif, kategori, urutan | [Pusat bantuan](reference/mobile-help.png) | Perubahan FAQ admin terlihat di app dan chatbot yang relevan. |
| Assignment dan tahap tugas | PNG cleaner + status pesanan mobile | Perubahan dari admin/cleaner tersimpan pada order yang sama dan terbaca customer. |

## Hasil pemeriksaan teknis

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run typecheck` | Lolos. |
| `npm run format:check` | Lolos. |
| `npm run build` | Lolos, termasuk route tugas publik dan route API frontend. |
| Tes penyimpanan cleaner terisolasi | 11 kelompok lolos: [hasil](store-checks.json). |
| Tes adapter cleaner dalam memori | 8 kelompok lolos: [hasil](adapter-checks.json). |
| Sembilan halaman utama termasuk login | 8 dapat dimuat; Pesanan tanpa filter gagal: [hasil](pages.json). |
| Sembilan pemeriksaan geometri dialog | Tidak ditemukan overflow horizontal atau footer keluar viewport pada sampel yang diperiksa: [hasil](ui-checks.json). Sampel mencakup desktop dan HP, bukan semua kemungkinan ukuran/isi. |
| Cleaner link langsung dan modal | Order yang benar, tanpa shell admin pada halaman langsung, refresh tetap tahap yang sama. Console halaman cleaner tidak mencatat error selama pemeriksaan. |
| Revisi tombol pesanan | Titik tiga sudah tidak dirender; empat ikon hapus berada di tengah dengan selisih koordinat praktis nol. |
| Notifikasi dibaca | Belum persisten: kembali menjadi 8 belum dibaca setelah refresh. |

Tidak mengulang seluruh create/update/delete lewat API fixture pada data aplikasi. Pemeriksaan CRUD dari hari sebelumnya tetap merupakan bukti pengujian terpisah, bukan klaim roundtrip baru pada audit ini.

## Perbedaan yang sengaja dipertahankan

- Logo panda sesuai sumber pengguna; tidak dikembalikan ke ikon bintang admin pada Figma.
- Font lebih terbaca dan animasi/bayangan yang tenang sesuai revisi. Perapian kepadatan tidak berarti mengecilkan semua tulisan.
- Tombol titik tiga tetap dihapus dan ikon hapus tetap di tengah.
- Tanpa create pesanan dan create jadwal, sesuai kebutuhan aplikasi customer.
- Tambah Banner Promo tetap di samping Tambah Layanan Baru; Kelola Promo tetap dekat Tambah kategori.
- Keahlian petugas tetap ada sesuai revisi field wilayah.
- Popup detail tetap dipertahankan.

Figma sendiri memiliki data contoh yang tidak konsisten: jam shift halaman dan popup berbeda, kartu repeat customer terduplikasi, serta kode banner `CLEANHEMAT` berbeda dari contoh checkout `CLEANGO20`. Nilai contoh tersebut tidak boleh menjadi aturan tetap aplikasi; keputusan final mengikuti kontrak data dan revisi pengguna.
