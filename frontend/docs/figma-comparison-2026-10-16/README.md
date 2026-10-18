# Perbandingan web admin dengan Figma — 16 Oktober 2026

Acuan: [CleanGo fix, HIGH FIDELITY WEB](https://www.figma.com/design/1lr9CMyydP3dI6axuKAUg6/CleanGo-fix?node-id=4002-7854).

Pemeriksaan memakai frame Figma yang diekspor langsung dari browser dan web lokal yang sedang berjalan. Acuan halaman utama umumnya berukuran 1280 px; screenshot web memakai viewport 1280 × 850. Pemeriksaan ini mencakup tampilan, isi dialog, dan penelusuran komponen terkait. Tidak ada perubahan kode aplikasi, penyimpanan form, pengiriman WhatsApp, penghapusan, atau reset data pada pemeriksaan ini.

Tool Figma tidak memberikan akses layer, tetapi file dapat dibaca dan diekspor lewat browser. Karena itu, catatan visual di bawah bukan pengukuran selisih setiap piksel atau verifikasi seluruh token font Figma. Data web masih berasal dari fixture lokal; kesesuaian dengan backend tim yang sesungguhnya belum dapat disimpulkan dari preview ini.

## Yang perlu didahulukan

| Prioritas | Temuan | Dampak / tindakan |
| --- | --- | --- |
| 1 | Daftar `/pesanan` tanpa pencarian gagal dimuat pada preview saat ini. | Data order tidak lengkap memicu `order.staff.join(...)`. Benahi fixture dan validasi respons agar satu record rusak tidak menjatuhkan seluruh halaman. |
| 1 | Definisi jam shift pada daftar berbeda dari form edit. | Daftar menulis pagi 08.00–11.30, siang 12.00–15.30, sore 16.00–19.30; editor menawarkan 08.00–12.00, 13.00–17.00, 18.00–21.00. Sepakati satu aturan dan gunakan sumber yang sama. Figma sendiri juga memiliki perbedaan ini antara halaman dan popup. |
| 2 | Popup Tugaskan Petugas jauh lebih sederhana daripada Figma. | Lengkapi informasi kru dan ringkasan pesanan; rekomendasi, jarak, serta notifikasi customer membutuhkan sumber data/integrasi. |
| 2 | Invoice dan unduh laporan belum selengkap Figma. | Invoice masih ringkasan satu layanan; unduhan baru CSV, belum dialog PDF/XLSX/cakupan data. |
| 2 | Detail layanan masih berupa ringkasan satu kolom. | Susunan dua kolom, pratinjau HP, ulasan dan statistik layanan belum tersedia. |
| 3 | Kepadatan halaman dan susunan tombol berbeda cukup besar. | Ringkas padding dan tinggi kartu secara konsisten sambil mempertahankan ukuran teks yang mudah dibaca. |

## Hasil per halaman

### Dashboard Utama

**Sudah ada:** pengumuman operasional, ringkasan pesanan, aktivitas terbaru, akses SOP, dan navigasi utama.

**Perbedaan visual:** pengumuman dan kartu statistik lebih tinggi; baris aktivitas sekitar 113 px pada sampel web sehingga baris ketiga berada di bawah lipatan layar 850 px. Figma memuat tiga baris dengan susunan lebih padat. Aksen warna vertikal dan catatan berbentuk badge pada statistik Figma tidak dipakai di web. Sidebar web juga tidak menampilkan panel kecil lingkungan di atas tombol keluar.

**Saran:** rapikan tinggi kartu, jarak antarseksi, dan posisi metadata. Jangan mengecilkan semua font sekaligus. Angka nol pada ringkasan hari ini bukan bukti fitur hilang: sampel order lama bertanggal September, sedangkan pemeriksaan dilakukan Oktober.

Bukti: [Figma](figma-dashboard.png) · [Web](web-dashboard.png). Frame `4002:7857`.

### Kelola Pesanan / Tugaskan Petugas

**Sudah ada:** daftar/filter status, penugasan, popup detail dan edit, pembatalan, hapus, serta Pantau Petugas.

**Belum sesuai Figma:**

- Popup penugasan hanya menampilkan nama customer, layanan/jam, dan checkbox nama kru. Figma memuat alamat dan rincian paket, kartu kru dengan foto, rating, pengalaman, spesialisasi, kesiapan, serta jarak dari lokasi.
- Pilihan rekomendasi otomatis/manual dan pilihan notifikasi estimasi kedatangan customer belum ada. Fitur ini tidak bisa dinyatakan selesai hanya dengan menambahkan tombol; perhitungan dan pengiriman harus terhubung ke layanan yang sebenarnya.
- Jam/slot pada form edit masih teks bebas. Figma menggunakan pilihan slot. Pilihan petugas di editor mendukung beberapa kru, tetapi belum menyertakan konteks keahlian/jarak seperti Figma.
- Tombol daftar dipisah menjadi Ubah, Detail, Hapus dan Pantau. Fungsi tambahan ini dibutuhkan sesuai revisi sebelumnya, tetapi susunannya dapat diringkas agar satu kartu tidak terlalu tinggi.

**Masalah preview yang terkonfirmasi:** `/pesanan` tanpa query menampilkan error pemuatan. Log menunjukkan `Cannot read properties of undefined (reading 'join')`, dengan pemanggil pada `components/OrderList.tsx:73`. Ada record fixture `ORDERS-106` sampai `ORDERS-111` yang hanya berisi `id`, `staffName`, dan `resend`, tanpa struktur order lengkap.

Penelusuran kode menunjukkan fixture di luar aplikasi mengambil empat segmen awal URL dan memperlakukan semua POST pada resource orders sebagai create. Akibatnya endpoint seperti `/api/orders/:id/cleaner-tasks` dapat masuk sebagai create order. Bentuk record rusak konsisten dengan payload kirim ulang. Ini temuan pada fixture lokal, bukan bukti backend produksi melakukan hal yang sama. Adapter frontend juga perlu memeriksa dukungan/respons endpoint dispatch; validasi daftar saat ini baru memeriksa `id`. Tidak ada POST dispatch yang dijalankan selama audit ini.

Pencarian `CL-89` disertai reload membuka sampel order yang valid untuk perbandingan. Data rusak tidak dihapus.

Bukti: [Figma daftar](figma-pesanan.png) · [Web daftar](web-pesanan.png) · [Error preview](web-pesanan-error.png) · [Figma penugasan](figma-assign.png) · [Web penugasan](web-assign.png) · [Figma editor](figma-pesanan-popup.png) · [Web editor](web-pesanan-popup.png). Frame daftar `4002:8223`, penugasan `4002:13374`, editor `4002:11843`.

### Pantau Petugas

**Sudah ada:** modal daftar tugas, tombol Buka Halaman Petugas, status pengiriman, petunjuk cadangan manual, dan mode uji tersimpan. Susunan daftar tugas ini merupakan tambahan dari permintaan terbaru.

**Belum setara fungsi Figma:** GPS langsung di peta, rute/ETA nyata, deteksi risiko terlambat, deteksi tiba otomatis, serta rangkaian notifikasi customer dari konfirmasi sampai invoice. Peta lama tersedia sebagai contoh simulasi, bukan pelacakan langsung.

Pada order biasa, UI menyatakan API chatbot/halaman tugas belum tersedia. Tombol buka/kirim ulang tetap terlihat, tetapi alur penuh hanya bisa diandalkan pada data uji sampai API tim memenuhi kontraknya. Jangan mengubah status menjadi Terkirim tanpa konfirmasi provider.

Bukti: [Figma](figma-tracking.png) · [Web](web-tracking.png). Frame `4002:10211`. Detail pengujian alur cleaner sebelumnya berada di `../cleaner-workflow-2026-10-15/`.

### Kelola Jadwal

**Sudah ada:** pengelompokan pagi/siang/sore, filter tanggal, popup detail/edit, pilihan petugas, status jadwal, daftar pesanan terhubung, dan hapus.

**Belum ada dibanding popup Figma:** kapasitas slot terisi/penuh, pengaturan kuota maksimum, status pekerja Bertugas/Izin/Cuti/Pelatihan, serta pemindahan pesanan antarshift. Area operasional hanya ditampilkan; belum menjadi pengaturan posko shift. Model sekarang terutama jadwal pesanan, sedangkan popup Figma juga mengelola shift pekerja. Ini membutuhkan kesepakatan model data dengan backend.

Daftar pesanan terhubung sudah ada, tetapi relasinya dihitung berdasarkan tanggal dan nama petugas; belum merupakan relasi slot shift yang eksplisit. Jam shift pada daftar/editor tidak konsisten seperti dicatat di prioritas 1.

**Sengaja tidak disalin:** tombol Atur Jadwal Baru dan tambah order manual pada slot kosong, karena user menetapkan jadwal berasal dari pesanan app.

Bukti: [Figma halaman](figma-jadwal.png) · [Web halaman](web-jadwal.png) · [Figma popup](figma-jadwal-popup.png) · [Web popup](web-jadwal-popup.png). Frame `4002:8581` dan `4002:11976`.

### Kelola Layanan

**Sudah ada:** CRUD, kategori, unggah/ganti/hapus foto, harga dasar dan harga promo, pratinjau harga/potongan, durasi, deskripsi, fasilitas dinamis, dan status aktif. Tambah Banner Promo serta Kelola Promo tersedia di posisi hasil revisi user.

**Form edit:** struktur dua kolom sudah mengikuti acuan secara umum. Fasilitas masih berupa satu teks per baris; belum ada judul + penjelasan terpisah dan penanda Termasuk seperti Figma. Estimasi durasi dan kebutuhan kru belum terpisah sebagai field terstruktur; sampel data memasukkan keduanya dalam satu teks durasi.

**Popup detail:** belum memakai komposisi dua kolom seperti Figma. Belum ada Lihat Preview HP, tenaga kru terpisah, rating/popularitas/jumlah dipesan, ulasan customer, rata-rata waktu selesai, dan kepuasan user. Semua itu memerlukan UI dan sebagian sumber data baru. Foto kosong pada sampel saat ini berarti foto belum diisi; kemampuan unggahnya sudah ada.

Statistik Paket & Bundle Favorit Figma diganti Harga Promo Aktif di web. Ini beda makna: hitungan promo tidak mengukur layanan favorit. Jika dibutuhkan, ukuran favorit harus berasal dari transaksi, bukan angka contoh.

Bukti: [Figma halaman](figma-layanan.png) · [Web halaman](web-layanan.png) · [Figma editor](figma-layanan-popup.png) · [Web editor](web-layanan-popup.png) · [Figma detail](figma-layanan-detail.png) · [Web detail](web-layanan-detail.png). Frame `4002:8932`, `4002:13569`, `4002:13985`.

### Kelola FAQ

**Sudah ada:** CRUD, kategori tambahan, pencarian, accordion jawaban, popup pratinjau, status publikasi, dan pagination.

Latar web sekarang memakai warna dasar yang sama dengan halaman lain. Figma FAQ sendiri memakai nuansa lebih kebiruan; tidak disarankan mengembalikan perbedaan itu karena user meminta konsistensi.

**Perlu dilengkapi:** verifikasi Tim QC beserta siapa/waktu verifikasinya belum menjadi alur/data. Statistik paling sering dibaca, jumlah pembaca dan waktu pembaruan sudah punya tempat di UI, tetapi fixture tidak memasok datanya. Pagination baru angka halaman; tombol Sebelumnya/Selanjutnya seperti acuan belum ada. Kartu FAQ lebih tinggi karena tombol CRUD mengambil baris tersendiri; dapat dipadatkan tanpa menghilangkan akses detail.

Bukti: [Figma halaman](figma-faq.png) · [Web halaman](web-faq.png) · [Figma popup](figma-faq-popup.png) · [Web popup](web-faq-popup.png). Frame `4002:10985` dan `4002:11495`.

### Kelola Data Petugas

**Sudah ada:** CRUD, filter kesiapan, keahlian, detail popup, tugas aktif, tautan jadwal, Hubungi WhatsApp dan salin tautan WhatsApp.

**Belum setara popup Figma:** indikator Kehadiran & Fisik dan statistik kepuasan. Posisi Kehadiran & Fisik saat ini dipakai untuk Jadwal Tercatat; artinya berbeda. Rating dan tanggal bergabung sudah didukung komponen, tetapi tidak tersedia pada sampel fixture. Keahlian petugas biasa juga masih kosong; data [UJI] menunjukkan chips keahlian bisa tampil.

Istilah kesiapan perlu diseragamkan antara daftar, filter, editor dan popup: Tersedia/Siaga & Tersedia, Bertugas/Sedang Bekerja. Tidak perlu mengubah nilai status backend agar label tampilan konsisten.

Bukti: [Figma halaman](figma-petugas.png) · [Web halaman](web-petugas.png) · [Figma popup](figma-petugas-popup.png) · [Web popup](web-petugas-popup.png). Frame `4002:9260` dan `4002:11614`.

### Kelola Data Customer

**Sudah ada:** tambah opsional, read/update/delete, WhatsApp, popup ringkasan, total selesai/belanja, alamat, layanan favorit, kru langganan, catatan dan riwayat pesanan.

Secara isi popup ini sudah dekat dengan Figma. Rating ke kru dan catatan khusus kosong pada sampel; tempat tampilnya sudah tersedia, sehingga ini terutama kebutuhan data. Perhitungan layanan favorit/kru langganan memakai riwayat yang tersedia; statistik lengkap perlu riwayat lengkap dari backend.

Figma halaman customer mengulang kartu Order Berulang dua kali. Web menampilkan Nilai Transaksi Selesai sebagai kartu ketiga; duplikasi Figma tidak perlu diikuti.

Bukti: [Figma halaman](figma-customer.png) · [Web halaman](web-customer.png) · [Figma popup](figma-customer-popup.png) · [Web popup](web-customer-popup.png). Frame `4002:9608` dan `4002:12464`.

### Laporan Keuangan & Operasional

**Sudah ada:** periode bulan, ringkasan pendapatan/pelanggan/order, grafik mingguan, metode pembayaran bila data tersedia, empat tab laporan, dan CSV.

**Belum ada:**

- Invoice lengkap seperti acuan: rincian item/add-on, subtotal, potongan voucher, total akhir, status pembayaran, waktu penerbitan, petugas, referensi pembayaran, Cetak, dan Kirim Ulang ke WA. Popup sekarang hanya customer/alamat, layanan, total, metode bayar bila tersedia, dan tautan detail order.
- Dialog ekspor dengan PDF, XLSX, CSV, pilihan cakupan data, dan rentang tanggal. CSV saat ini berisi ID, customer, layanan, tanggal, status, harga. Ekspor tidak mengikuti jenis tab laporan yang dipilih.
- Perbandingan pertumbuhan dengan bulan sebelumnya, pelanggan aktif berulang, ketepatan selesai, serta data beban/bagi hasil kru. Data pengeluaran/payout/pembayaran harus disepakati dengan backend; jangan menyalin persentase contoh Figma sebagai hasil nyata.
- Pemilih bulan masih input bulan bawaan browser dalam popover; belum berupa panel pilihan bulan khusus seperti acuan.

Ringkasan metode pembayaran kosong pada preview karena order selesai tidak menyertakan `paymentMethod`; komponen grafik metode bayar sudah tersedia.

Bukti: [Figma halaman](figma-laporan.png) · [Web halaman](web-laporan.png) · [Figma invoice](figma-invoice.png) · [Web rincian](web-invoice.png) · [Figma ekspor](figma-export.png). Frame `4002:9872`, `4002:12671`, `4002:12828`.

### Login, filter tanggal, dan SOP

| Area | Sudah ada | Perbedaan / kekurangan |
| --- | --- | --- |
| Login | Identitas CleanGo, bantuan, username/password, tampilkan password, ingat saya, loading/error. | Tautan/alur Lupa Kata Sandi Figma belum ada. Badge portal admin, penjelasan akses khusus, dan kartu tips bawah disederhanakan. Pemulihan akun perlu endpoint/policy backend. |
| Kalender | Popup, navigasi bulan, Hari Ini, hitungan per tanggal, rentang tanggal, ringkasan pilihan. | Belum ada rincian jumlah sesi pagi/siang/sore pada tanggal terpilih seperti Figma. Pilihan rentang adalah tambahan, bukan kekurangan. Audit ini tidak mengulang tes scroll seluruh ukuran layar. |
| SOP | Popup, panduan beberapa tahap, navigasi tab dan tombol tutup. | Tab berdasarkan jenis layanan, indikator versi dokumen, dan unduh PDF SOP resmi belum ada. Tab saat ini berdasarkan tahap pengerjaan. Dokumen PDF tidak boleh dibuat seolah telah disahkan tanpa sumber resminya. |

Bukti: [Figma login](figma-login.png) · [Web login](web-login.png) · [Figma kalender](figma-filter.png) · [Web kalender](web-filter.png) · [Figma SOP](figma-sop.png). Frame login `4002:8144`, kalender `4002:10579`, SOP `4002:13208`.

## Revisi user yang tetap dipertahankan

- Logo CleanGo panda dari referensi user; tidak dikembalikan ke ikon bintang Figma.
- Teks yang lebih terbaca, jarak yang wajar, dan bayangan/animasi yang tenang. Pemadatan kartu tidak berarti mengembalikan seluruh teks ke ukuran Figma.
- Tanpa create pesanan dan create jadwal; data datang dari aplikasi customer.
- Keahlian petugas pada form sesuai revisi; tidak menggantinya kembali menjadi wilayah.
- Tambah Banner Promo di samping Tambah Layanan Baru, serta Kelola Promo dekat Tambah Kategori.
- Kategori layanan/FAQ dinamis dan akses hapus sesuai kebutuhan CRUD.
- Halaman tugas cleaner, salin link, kirim ulang, dan status simulasi yang jelas.
- Popup detail tetap dipertahankan. Perbaikan visual tidak menggantinya dengan halaman detail biasa.

## Rujukan kode

- `components/OrderList.tsx:73`: akses `staff.join` tanpa validasi struktur lengkap.
- `lib/api.ts:124`: pemeriksaan daftar terutama memastikan bentuk daftar dan ID.
- `lib/cleaner/service.ts:299`: dispatch penugasan; `:434`: kirim ulang.
- `components/AssignmentFormServer.tsx:7`: popup penugasan sederhana.
- `components/ScheduleList.tsx:10` dan `components/BookingEditors.tsx:351`: dua definisi jam shift.
- `components/RecordDetailServer.tsx:223`: detail layanan; `:169`: FAQ; `:58`: customer.
- `components/ServiceForm.tsx`: editor foto, tarif promo dan fasilitas satu teks.
- `components/StaffDetailServer.tsx:164`: Jadwal Tercatat.
- `components/ReportView.tsx:107`: unduh CSV; `:241`: popup rincian transaksi.
- `app/(admin)/laporan/export/route.ts`: cakupan CSV.
- `components/SopDialog.tsx`: SOP berdasarkan tahap.

Semua screenshot Figma dalam folder ini diekspor dari file acuan pada pemeriksaan ini. Screenshot web menunjukkan preview lokal, bukan deployment produksi. Pemeriksaan tidak menjalankan ulang seluruh pengujian CRUD atau pengiriman pesan; hasil pengujian alur sebelumnya tetap terpisah dari audit kesesuaian desain ini.
