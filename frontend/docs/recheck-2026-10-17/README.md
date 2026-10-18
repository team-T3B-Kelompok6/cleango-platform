# Ringkasan perubahan dan pemeriksaan — 17 Oktober 2026

Frontend admin serta portal cleaner sudah diperiksa kembali menggunakan data demo dan fixture HTTP terisolasi. Tidak ada pengiriman WhatsApp sungguhan. Backend tim dan aplikasi mobile tidak diubah. Perubahan masih lokal, belum di-commit/push pada pekerjaan ini.

## Perubahan yang sudah dikerjakan

| Bagian | Hasil akhir |
| --- | --- |
| Popup | Ukuran mengikuti isi, header/footer dan tombol konsisten, warna netral, form bisa di-scroll, konfirmasi hapus ringkas dengan tombol merah. Detail baca terpisah dari Ubah. Catatan Boo/tips dekoratif dihilangkan. |
| Pesanan | Penugasan tersimpan sebelum pengiriman link. Detail, editor, pembatalan dan hapus tetap tersedia; kegagalan pengiriman tidak membuang penugasan. |
| Jadwal | Khusus shift petugas: nama/area petugas, tanggal, jam, status dan jumlah pesanan terkait. Admin dapat membuat shift. Tidak lagi menjadi daftar customer/layanan. |
| Penugasan | Pilihan petugas mengikuti shift aktif, tanggal dan cakupan jam pesanan. Bentrok pesanan dicegah; shift yang masih diperlukan pesanan aktif tidak boleh dihapus/dipindahkan hingga penugasan dibereskan. |
| Pantau | Dari pesanan hanya menampilkan petugas/tugas pesanan itu, tanpa Semua petugas atau dropdown pesanan lain. Lokasi Petugas berada di samping Buka Halaman Petugas. Halaman cleaner terbuka dalam modal; Salin Link dan Kirim Ulang tersedia. |
| Cleaner | URL khusus tugas, tampilan HP, informasi customer/layanan/alamat/jadwal, keberangkatan, tiba, pengerjaan, foto dan laporan. Status serta timestamp bertahan setelah refresh; tombol utama mengikuti scroll form. Status pekerjaan selesai terpisah dari status kirim laporan. |
| Layanan | Foto, fasilitas, durasi, publikasi dan harga normal. Harga promo dipindah ke Kelola Promo. Label kode kecil seperti #SRV-01 di kartu layanan dihilangkan; identitas penyimpanan tetap sama. |
| Promo/banner | Diskon khusus di Kelola Promo. Opsi penggabungan harga promo lama dihapus; preview menunjukkan harga normal, potongan, dan harga akhir. Tombol banner berada di sebelah Tambah Promo. |
| FAQ | Jawaban langsung di bawah garis pertanyaan, sejajar tombol Ubah/Detail/Hapus pada desktop. Tidak ada footer/garis tambahan. Pada HP susunan menyesuaikan agar terbaca. |
| Customer/kontak | Tambah Customer dihapus karena pendaftaran lewat aplikasi. Nomor/email contoh dirapikan sesuai nama; tetap fiktif dan pengiriman tetap disimulasikan. |
| Data contoh | Penugasan, laporan dan progres lama dipertahankan. Label/kontrol uji disembunyikan; status simulasi tetap jujur. |

## Hasil pemeriksaan terbaru

- [85 pemeriksaan browser](browser-checks.json) lolos: login benar/salah, logout, seluruh sidebar; delapan halaman pada 1280/768/360 px; detail/editor/tambah/hapus enam menu di desktop/HP; promo/banner; pencarian kosong; jadwal petugas; FAQ sejajar; kode layanan hilang; Pantau terkunci pada pesanan; link cleaner langsung dan refresh laporan.
- [12 kelompok demo/store](demo.txt) lolos: CRUD, shift, penugasan, keberangkatan, selesai, retry saat kirim gagal, foto, persistensi dan pembatasan mode demo. Data tes menggunakan direktori sementara terpisah dari data pengguna.
- [4 kelompok aturan promo](promo.txt) lolos: perhitungan dari harga normal, batas potongan, minimal transaksi, nilai tidak negatif dan stacking nonaktif.
- [13 kelompok HTTP](http.txt), [hasil JSON](http-results.json) dan [jurnal request tanpa body/token](http-requests.json) lolos terhadap fixture lokal. Meliputi auth, CRUD, jadwal, upload, kategori/banner/promo, empty/error, sesi kedaluwarsa dan API lambat.
- [Build](build.txt) serta [format](format.txt) lolos; TypeScript juga lolos. Fixture pengujian dihentikan sesudah tes; dev server utama tetap berjalan.

Skrip HTTP disesuaikan dengan kontrak shift terbaru: sekarang menguji POST schedules tanpa customer/layanan dan memilih petugas dengan shift yang cocok. Pemeriksaan customer memakai read/update/delete, bukan pendaftaran dari admin.

Saat pengecekan ditemukan sisa teks bawaan seperti “mode uji” dalam jawaban FAQ dan “untuk menguji filter” pada deskripsi layanan. Teks seed dan data contoh lama diperbaiki melalui pencocokan persis; konten yang sudah diedit tidak ditimpa. Perubahan ini tidak mereset order/task, timestamp, foto, atau laporan.

Data contoh lama berjadwal 15–16 Oktober tetap dipertahankan. Karena sekarang 17 Oktober, ringkasan **Hari Ini** bisa nol meskipun daftar pesanan masih terisi; ini mengikuti tanggal data, bukan kegagalan memuat halaman. Gunakan filter periode untuk melihat data tersebut atau atur tanggal pesanan/shift melalui editor saat perlu demo hari ini.

## Yang masih menunggu backend tim

- Persistensi MySQL dan autentikasi produksi.
- Validasi shift/bentrok secara atomik di backend sesuai [API-CONTRACT.md](../API-CONTRACT.md).
- Provider chatbot/WhatsApp sungguhan, status pengiriman sebenarnya, retry dan laporan ke customer.
- GPS perangkat nyata dan sinkronisasi status/foto/laporan dengan aplikasi mobile.

Demo/fixture yang lolos tidak membuktikan integrasi produksi di atas. Draft WhatsApp yang terbuka juga tidak dianggap sudah terkirim.

## Bukti visual

- [FAQ terbaru](faq-final.jpg).
- [Jadwal petugas](jadwal-final.jpg).
- [Cleaner pada lebar HP](cleaner-phone.jpg); URL token tidak disimpan dalam jurnal/screenshot.
- [Pemeriksaan seluruh popup sebelumnya](../popup-review-2026-10-16/README.md).

Ulangi dengan `npm run check:demo`, `npm run check:promo`, dan `npm run build`. Untuk transport HTTP, jalankan `npm run qa:api`, lalu `npm run check:uts:http -- --recheck` di terminal lain. Jangan mengarahkan fixture ini ke data backend tim.
