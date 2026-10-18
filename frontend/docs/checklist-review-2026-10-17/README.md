# Pemeriksaan checklist frontend — 17–18 Oktober 2026

Pengujian menggunakan store demo sementara dan fixture HTTP loopback terpisah dari data pengguna. API tim belum diterima oleh pemilik frontend. Hasil ini tidak menyatakan integrasi API tim, MySQL, WhatsApp nyata, GPS perangkat, atau aplikasi mobile telah selesai. PPT tidak dikerjakan sesuai permintaan.

| Checklist | Hasil |
| --- | --- |
| Login sampai logout | Lulus: password salah, tampilkan password, login benar, logout, akses terlindungi, dan sesi HTTP kedaluwarsa. |
| Seluruh sidebar | Delapan menu dibuka melalui navigasi desktop/tablet/HP. |
| CRUD layanan | Tambah dengan foto dan fasilitas, detail, reload, perubahan harga, batal hapus, dan hapus data sementara lulus. |
| Pesanan | Penugasan dua kru, tahap individu, catatan pelanggan, jam booking/aktual, dan hapus pesanan QA lulus. |
| Jadwal | Tambah, detail, ubah jam, dan hapus shift QA tanpa customer/layanan lulus. Validasi shift/bentrok juga diuji di runner demo/HTTP. |
| Cleaner | Alur dua kru diuji pada viewport 360 px. Satu kru selesai tidak menyelesaikan seluruh pesanan; kru yang sudah selesai tidak tetap dianggap aktif. Reload mempertahankan laporan. Tombol selesai berada dalam layar dengan transform none. |
| Customer | Detail, ringkasan transaksi selesai, ubah email, dan hapus customer QA lulus. Pendaftaran customer bukan fitur admin. |
| Petugas dan FAQ | Tambah, detail, ubah, hapus, status training, dan pagination FAQ lulus. |
| Laporan | Empat tab, rincian transaksi, dan [ekspor CSV](laporan-qa.csv) lulus. |
| Risiko | Tidak ada modul risiko terpisah di aplikasi; klausul “jika tersedia” tidak berlaku. |
| Loading/error/kosong | Loading API lambat, daftar kosong dari API, pencarian kosong/reset, error 503, dan pemulihan lewat Coba lagi lulus di browser. |
| Lebar 360/768/1280 | Sembilan halaman termasuk login × tiga ukuran: 27 kombinasi tanpa overflow horizontal. Ini emulasi viewport, bukan HP fisik. |
| Build dan dokumentasi | Build produksi, TypeScript, format, README, render, perbandingan Figma, dan panduan demo disiapkan. |

## Hasil dan bukti

- [71 pemeriksaan browser](browser-checks.json) lulus; [27 kombinasi responsif](responsive.json).
- [14 kelompok demo](demo.txt), [4 kelompok promo](promo.txt), dan [13 kelompok HTTP](http-results.json) lulus. Fixture HTTP memakai data sementara dan bukan API tim.
- Verifikasi ulang pada checkout hasil gabungan: [demo](demo-final.txt), [promo](promo-final.txt), [format](format-final.txt), [build produksi](build-final.txt), dan [TypeScript](typecheck-final.txt) lulus.
- [Jurnal HTTP tanpa body/token](http-requests.json), [loading](screenshots/loading-1280.jpg), [API kosong](screenshots/api-kosong-1280.jpg), [error](screenshots/api-error-360.jpg), dan [pemulihan](screenshots/api-pulih-360.jpg).
- [Strategi render](RENDER-STRATEGY.md), [perbandingan screenshot Figma](FIGMA-COMPARISON.md), dan [panduan demo](DEMO.md).

Pengujian menemukan dua masalah filter petugas: tab Nonaktif muncul dua kali dan label Bertugas ikut ditampilkan Sedang Bekerja. Tab dideduplikasi dan label dibedakan sesuai status operasional. Pengujian ulang memverifikasi satu Nonaktif serta label Bertugas/Sedang Bekerja yang terpisah. [Bukti akhir](screenshots/filter-petugas-final-1280.jpg). [Error konsol sesudah perbaikan](browser-errors-after-fix.json) kosong pada pengujian demo sebelum injeksi gangguan API.

Satu observasi runner mencatat tab cleaner baru masih memakai viewport default 1280. Pengujian HP kemudian dilakukan pada tab yang sudah diverifikasi benar-benar 360; ini kendala pengaturan alat, bukan kegagalan layout. Dua pesanan dummy pada data pengguna yang diuji sebelumnya tidak direset oleh checklist ini.

Screenshot dan pengujian browser direkam 17 Oktober; pemeriksaan gabungan sebelum push dilakukan 18 Oktober. Berkas log di folder ini adalah bukti pengujian, bukan data transaksi produksi.
