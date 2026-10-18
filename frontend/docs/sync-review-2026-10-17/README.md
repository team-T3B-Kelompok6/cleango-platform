# Pemeriksaan sinkronisasi — 17 Oktober 2026

Perbedaan yang ditemukan: daftar pesanan sudah menampilkan waktu kerja aktual, tetapi Pantau Petugas, cleaner, dashboard, dan riwayat customer masih mencetak slot booking. Pembaruan otomatis daftar juga sebelumnya bergantung pada modal Pantau Petugas.

Sekarang format waktu memakai satu fungsi bersama. Booking hanya menampilkan waktu mulai; pengerjaan selesai memakai waktu mulai–selesai yang tercatat, zona Asia/Jakarta. Catatan waktu yang belum lengkap tetap ditandai belum tercatat. Slot booking lengkap tetap tersedia untuk pemeriksaan shift, tanpa ditimpa waktu aktual.

Pembaruan otomatis membaca revisi orders, staff, dan tugas setiap 5 detik pada halaman aktif. Perubahan status, waktu, serta catatan ikut memperbarui tampilan server. Tab tersembunyi dan isian yang sedang diketik menunda polling. Pantau Petugas memperbarui datanya sendiri.

## Verifikasi

- 17 pemeriksaan browser lulus; rincian pada `browser-checks.json`. Satu pembacaan awal indikator disabled dilakukan sebelum permintaan validasi selesai, disimpan sebagai observasi, lalu diuji ulang menggunakan pesan validasi dan status tugas.
- Pengujian yang mengubah data dilakukan pada server sementara 127.0.0.2:3002, folder data dan keluaran build terpisah. Server tersebut sudah dihentikan. Data utama pengguna hanya diperiksa baca-saja.
- Alur diuji: assign → buka link → berangkat → tiba/mulai → validasi laporan → selesai → kegagalan kirim laporan → kirim ulang. Hasil akhir dan waktu bertahan setelah refresh.
- Perubahan catatan oleh admin muncul di cleaner tanpa refresh manual dan tidak mengganti waktu selesai.
- Status dari cleaner memperbarui daftar dan detail secara otomatis walau modal Pantau Petugas ditutup.
- Waktu aktual cocok pada daftar, detail, Pantau Petugas, cleaner, dashboard, dan riwayat customer. CL-9106 milik data utama juga diperiksa dan cocok: 09.28–09.28 WIB.
- Pantau Petugas diperiksa pada lebar HP 360 px; isi tidak meluap.
- `npm run check:demo`: 12 kelompok lulus, tanpa permintaan eksternal.

Pengujian ini mencakup frontend dan mode demo tersimpan. Konsistensi transaksi dan pengiriman WhatsApp sungguhan tetap perlu diuji dengan backend tim saat tersedia.

## Bukti

- `cl-9106-sinkron.jpg`: Pantau Petugas pada data yang ditunjukkan pengguna.
- `pantau-jam-sinkron.jpg`: hasil alur pengujian terpisah.
- `browser-checks.json`: hasil pemeriksaan browser.

Untuk mengulang uji browser secara terpisah, gunakan folder data sementara melalui `CLEANER_DEMO_DATA_DIR`, `ADMIN_DEMO_ENABLED=true`, serta `CLEANGO_QA_DIST_DIR=.next-sync-qa`, lalu jalankan Next dev pada host dan port yang berbeda. Jangan mengarahkan pengujian mutasi ke folder `.local/cleaner-demo` pengguna.
