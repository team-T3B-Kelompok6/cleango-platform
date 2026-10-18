# Pengelolaan promo dan kalender — 15 Oktober 2026

Kelola Promo ditambahkan di sebelah Tambah kategori pada halaman Kelola Layanan. Admin dapat menambah, melihat, mengubah, menonaktifkan/mengaktifkan, dan menghapus kode promo. Form mendukung diskon persen atau nominal, batas potongan, minimal transaksi, periode WIB, kuota total, batas per pelanggan, semua layanan atau pilihan beberapa layanan, serta izin penggabungan dengan harga promo layanan.

Gambar banner tetap dikelola lewat Tambah Banner Promo di sebelah Tambah Layanan Baru. Harga promo langsung pada katalog tetap berada di Ubah Layanan. Kedua fitur tersebut tidak berubah menjadi kode voucher.

Daftar dan form memakai dialog yang sama, dengan tinggi tetap, header/footer tetap, dan area isi yang dapat digulir. Form dua kolom pada desktop berubah menjadi satu kolom pada layar kecil. Style mengikuti warna, font, ukuran kontrol, dan animasi dialog yang sudah dipakai halaman lain.

## Pemeriksaan

- TypeScript, format, dan build produksi: lihat [build.txt](build.txt).
- Validasi serta perhitungan: [rules.json](rules.json). Meliputi persen 1–100, rupiah bulat, kode, tanggal, cakupan, duplikasi, kuota, batas potongan, pembulatan, kombinasi harga, respons simpan yang tidak lengkap, aktif/nonaktif, dan kegagalan hapus.
- UI promo: [ui-checks.json](ui-checks.json). Tambah dengan dua layanan, baca kembali, edit, aktif/nonaktif, hapus, pencarian, filter status, kode duplikat, dan pilihan kosong. Kegagalan endpoint 404/503 ditampilkan tanpa merusak katalog atau melaporkan simpan berhasil.
- Responsif: [responsive.json](responsive.json), ukuran 1280×900, 768×1024, 360×800, 800×360; dialog dan footer tetap dalam viewport tanpa overflow horizontal.
- Kalender: [calendar-checks.json](calendar-checks.json). Di Pesanan dan Jadwal, kalender menutup saat tombol pemicunya tergulir ke balik header. Lapisan header tetap di atas tombol/panel. Posisi kalender memperhitungkan tinggi header; pada layar pendek panel berada di bawah header, bukan di bagian paling atas viewport. Scroll internal kalender tetap berjalan dan tidak menggeser halaman.
- Build produksi: [production.json](production.json). Login, pemuatan daftar promo, roundtrip status lewat Server Action, dan penutupan kalender saat scroll lolos; tidak ada error console selama pemeriksaan tersebut.

Pengujian menggunakan API preview lokal terpisah dari aplikasi yang dikumpulkan. Data percobaan dihapus setelah pengujian. Browser pengujian memakai reduced motion, sehingga pemeriksaan gerak normal belum dilakukan secara visual; CSS mengikuti preferensi tersebut.

## Tampilan

- [Tombol pada Kelola Layanan](service-actions.png)
- [Daftar promo](list-desktop.png)
- [Form dan pilihan layanan](form-desktop.png)
- [Form di ponsel](form-360.png)
- [Kalender di ponsel](calendar-360.png)
- [Kalender di layar pendek 640×360](calendar-landscape.png)

## Integrasi tim

Pekerjaan ini hanya mengubah frontend web admin. Endpoint `/promos` belum tersedia pada backend tim yang terakhir diperiksa. Kontrak request, respons, aturan harga dan tanggung jawab validasi checkout tersedia di [API-CONTRACT.md](../API-CONTRACT.md#pengelolaan-kode-promo-15-oktober-2026). Penyimpanan database, penerapan kode pada checkout, dan pengurangan kuota perlu diselesaikan backend/mobile sebelum pengujian bersama.
