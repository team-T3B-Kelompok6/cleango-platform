# Revisi antarmuka — 16 Oktober 2026

Lanjutan terbaru: [perapihan dan pemeriksaan seluruh popup](../popup-review-2026-10-16/README.md), termasuk ukuran dialog, footer, konfirmasi hapus, serta tampilan desktop/HP/tablet.

Revisi ini mengikuti instruksi terbaru pengguna dan menggantikan beberapa keputusan desain pada audit/paket UTS sebelumnya. Frontend admin dan halaman cleaner diperbarui; backend Express dan aplikasi mobile tidak diubah. Presentasi tidak termasuk pekerjaan ini.

## Perubahan per halaman

| Bagian | Perubahan |
| --- | --- |
| Jadwal | Jadwal adalah shift kerja petugas yang dapat ditambah admin. Kartu memakai nama/area petugas dan jumlah pesanan terkait. Detail berupa ringkasan baca, Ubah membuka editor terpisah; POST/PATCH hanya mengirim petugas/tanggal/jam/status. |
| Pesanan | Detail tidak lagi langsung berupa form. Tombol Ubah membuka editor; penugasan, status dan alur dispatch dipertahankan. |
| Layanan | Form satu kolom yang lebih ringkas, foto tetap tersedia. Hanya harga normal yang dapat dimasukkan. Harga promo lama tidak lagi ditampilkan sebagai harga katalog; simpan layanan membersihkan field legacy. |
| Kelola Promo | Semua diskon diatur di sini. Opsi penggabungan dengan harga promo layanan dihapus. Preview menampilkan harga normal, potongan kode, dan harga akhir; minimal transaksi/batas potongan tetap divalidasi. |
| Banner | Tambah Banner Promo dipindah ke sebelah Tambah Promo di dalam Kelola Promo. Tidak ada tombol banner di heading layanan. |
| FAQ | Jawaban langsung ditampilkan di bawah garis pemisah pertanyaan, tanpa harus membuka accordion. |
| Customer | Tambah customer dihapus. Route create dan Server Action create tidak dapat dipakai; customer mendaftar melalui aplikasi. Detail/edit/hapus tetap tersedia. |
| Pantau Petugas | Satu kartu per petugas, termasuk petugas tanpa tugas. Penugasan dipilih dalam kartu; Lokasi Petugas berada tepat di samping Buka Halaman Petugas. Lokasi menggunakan timestamp lokasi terbaru yang tersedia. |
| Cleaner | Gaya netral dan konsisten, tanpa pesan Boo, ilustrasi pendamping, banner data uji atau blok peta dekoratif. Informasi tugas, navigasi Maps, tahapan, foto dan laporan tetap tersedia. Tombol utama mengikuti scroll form. |
| Semua popup | Header/footer dan radius disamakan, backdrop tanpa blur, form lebih ringkas. Konfirmasi hapus mengikuti tinggi isi; tombol merah dan teks putih dengan pending state. |

Catatan Boo dan tips generik dihilangkan. Catatan pelanggan yang memang merupakan data pesanan/customer tetap ditampilkan sebagai teks biasa. Label `[UJI]`, banner mode demo dan tombol seed/reset disembunyikan dari produk. Nama pada data contoh dinormalisasi sekali tanpa mereset assignment, tahap, waktu, laporan, atau foto. ID penyimpanan sample tetap stabil; UI menampilkan kode pendek dan URL/task token tetap menggunakan ID aslinya.

Data contoh development tetap tersedia agar frontend dapat diperiksa. Status pengiriman simulasi tetap dibedakan dari Terkirim. Lokasi contoh tidak diklaim sebagai GPS nyata; tombol kontak dummy tidak menghubungi nomor sungguhan. Tidak ada pengiriman WhatsApp asli pada pengujian ini.

## Pengujian

Pembaruan jadwal petugas: [12 kelompok tes demo/store](staff-shifts-check.txt), [9 pemeriksaan browser](staff-shifts-browser.json), TypeScript, format, dan [production build](staff-shifts-build.txt) lolos. Browser menguji tambah/ubah/refresh/hapus shift sementara; shift Raka diubah sementara dari Terjadwal ke Nonaktif, namanya hilang dari pilihan penugasan, lalu muncul lagi setelah status dipulihkan. Shift sementara sudah dihapus, penugasan pengguna tidak diubah. Tampilan daftar/form juga diperiksa pada lebar 360 px. Data demo lama dikonversi sekali dari kartu per pesanan menjadi shift per petugas/tanggal, tanpa mengubah record order, task, token, laporan, foto, atau waktu progres.

- [29 pemeriksaan browser](browser-checks.json) lolos: detail/edit terpisah, field yang dihapus, tampilan FAQ, customer, Pantau per petugas, lokasi, kedua tahap cleaner, simpan/hapus layanan dan promo sementara, serta responsivitas delapan halaman dan enam popup pada 360 px.
- [9 kelompok store/demo](demo-check.txt) lolos, termasuk penugasan, keberangkatan, selesai, kegagalan pengiriman dan retry tanpa mengubah data demo pengguna.
- [4 kelompok aturan harga](promo-check.txt) lolos: persentase dari harga normal meskipun ada field promo legacy, batas potongan, nominal tidak negatif, minimal transaksi, dan parser yang memaksa penggabungan nonaktif.
- [13 kelompok HTTP](http-results.json), [log](http-check.txt), dan [jurnal request tanpa token/body](http-requests.json) lolos terhadap fixture sementara, bukan backend tim/MySQL.
- [Format](format.txt) dan [production build](build.txt) lolos; TypeScript juga lolos. Data layanan/promo sementara yang dibuat melalui UI sudah dihapus kembali.

Ulangi tes harga dengan `npm run check:promo`, store dengan `npm run check:demo`. Untuk HTTP, jalankan `npm run qa:api` pada terminal pertama lalu `npm run check:uts:http -- --revision` pada terminal kedua; hentikan fixture setelah selesai.

## Screenshot hasil

- [Jadwal petugas](staff-shifts.jpg) · [Penugasan sesuai shift](assignment-by-shift.jpg) · [Form shift HP](staff-shift-form-phone.jpg).

Pembaruan Pantau dari kartu pesanan: daftar dikunci pada ID pesanan yang dipilih, tanpa pencarian, tombol Semua petugas, atau pilihan penugasan lain. Semua petugas yang ditugaskan pada pesanan itu tetap ditampilkan. Akses dari kartu petugas juga dikunci pada nama tersebut; daftar menyeluruh tetap tersedia dari heading Kelola Data Petugas. [6 pemeriksaan browser](tracking-scope-checks.json) dan [build](tracking-scope-build.txt) lolos; [hasil Pantau khusus pesanan](pantau-pesanan.jpg).

- [Detail jadwal](jadwal-detail.jpg) · [Ubah jadwal](jadwal-edit.jpg).
- [Detail pesanan](pesanan-detail.jpg) · [Ubah pesanan](pesanan-edit.jpg).
- [Form layanan](layanan-form.jpg) · [Konfirmasi hapus](hapus-konfirmasi.jpg).
- [Kelola Promo dan tombol banner](kelola-promo.jpg) · [Preview harga promo](promo-preview.jpg).
- [FAQ desktop](faq.jpg) · [FAQ HP](faq-phone.jpg).
- [Pantau per petugas](pantau-petugas.jpg) · [Lokasi petugas](lokasi-petugas.jpg).
- [Cleaner HP awal](cleaner-phone.jpg) · [Tombol mengikuti form](cleaner-action-phone.jpg) · [Cleaner saat pengerjaan](cleaner-working-phone.jpg).

## Catatan integrasi

### Pembaruan kontak contoh

Nomor nol dan email `uji01@example.test` diganti dengan kontak contoh berformat Indonesia dan email sesuai nama pada domain `example.com`, konsisten pada daftar, popup, dan tugas cleaner. Nomor tidak diverifikasi sebagai kontak nyata; akses WhatsApp data DEMO tetap diblokir dan delivery tetap simulasi. Migrasi hanya mengganti placeholder, mempertahankan kontak yang sudah diedit, serta tidak mengubah assignment atau progres tugas. [10 kelompok tes demo](contacts-check.txt), TypeScript, dan [build terbaru](contacts-build.txt) lolos. Kontak diperiksa langsung pada daftar dan popup customer/petugas: [customer](customer-contacts.jpg), [petugas](staff-contacts.jpg).

Kontrak terbaru ada pada [API-CONTRACT.md](../API-CONTRACT.md). Backend perlu mendukung POST/PATCH jadwal shift petugas tanpa customer/layanan, serta memvalidasi cakupan jam, bentrok penugasan, duplikasi shift dan perubahan/penghapusan shift aktif secara atomik. Frontend tidak mengubah backend tim; alur ini sudah tersedia pada adapter demo. Backend juga perlu menghitung kode promo dari harga normal, menonaktifkan stacking lama, membersihkan `discountPrice` legacy, dan mendukung task/dispatch/lokasi yang sama. Selesai pekerjaan dan delivery laporan tetap dua status berbeda.

Integrasi MySQL, provider WhatsApp, GPS perangkat asli dan sinkronisasi mobile masih menunggu backend. Perubahan tersimpan lokal, belum dipush atau di-merge pada revisi ini.
