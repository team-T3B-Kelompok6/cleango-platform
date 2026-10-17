# Pesan semangat Boo per penugasan

Delapan pesan tentang persiapan alat, perjalanan, ketelitian, komunikasi pelanggan, kebersihan alat, koordinasi admin, dan pemeriksaan hasil. Sesuai klarifikasi pengguna, satu pesan dipilih untuk setiap penugasan; tidak berputar selama halaman terbuka.

Pilihan diturunkan dari ID tugas yang tetap untuk satu penugasan. Modal admin, link langsung, pembaruan data, dan refresh menampilkan pesan yang sama. Penugasan baru dengan ID baru memperoleh pilihan dari delapan pesan. Pilihan acak dapat kebetulan sama pada dua penugasan. Timer serta tombol Jeda/Lanjutkan dan Pesan lain dihapus; tampilan kembali menjadi kartu pesan sederhana.

Pengujian komponen dengan 64 ID contoh menghasilkan delapan variasi, sedangkan ID yang sama selalu menghasilkan pesan yang sama. Pengujian browser pada modal admin dan halaman HP 390 × 844 memastikan pesan konsisten setelah polling/refresh, hanya satu pesan tampil, kontrol carousel tidak ada, serta tanpa overflow/error console. Tombol keberangkatan tetap berada dalam alur scroll. Tidak ada progres tugas yang diubah.

Typecheck, format file yang diubah, dan build produksi lolos. [Hasil browser](checks.json) · [Tampilan HP](phone.jpg).
