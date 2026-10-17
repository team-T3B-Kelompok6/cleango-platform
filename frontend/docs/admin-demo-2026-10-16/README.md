# Mode demo frontend — 16 Oktober 2026

Mode lokal untuk mengecek frontend tanpa menunggu API. Aktifkan `ADMIN_DEMO_ENABLED=true`, jalankan `npm run dev`, buka http://127.0.0.1:3000, lalu login **admin / admin**. Pada komputer ini mode tersebut sudah diaktifkan di `.env.local` yang diabaikan Git.

## Data yang dapat diperiksa

| Halaman | Data contoh |
| --- | --- |
| Dashboard / Pesanan | 20 pesanan awal: 3 skenario cleaner lama, 3 pesanan baru Menunggu Assign, 12 riwayat selesai/batal, dan 2 contoh tugas aktif. Angka/status berubah mengikuti pengujian. |
| Jadwal | Jadwal terkait pesanan yang sudah mempunyai petugas, mencakup tiga shift dan tanggal berbeda. Form ubah/hapus memakai penyimpanan demo. |
| Layanan | 6 layanan, 4 kategori, foto lokal, fasilitas, 2 harga promo, serta 1 layanan nonaktif. |
| Kelola Promo | UJIHEMAT20 untuk semua layanan, UJIRUMAH20 untuk layanan tertentu, UJIBESOK20 untuk periode mendatang, UJILAMA20 untuk periode berakhir. Semua kode adalah contoh pengaturan, bukan voucher backend/mobile. |
| Banner | Satu record gambar contoh dan dukungan unggah/simpan gambar dari tombol Tambah Banner Promo yang sudah ada. UI memilih/edit/hapus banner lama belum tersedia; data dummy tidak dianggap menambahkan UI tersebut. |
| FAQ | 7 pertanyaan: 6 aktif dan 1 draf, kategori, statistik pembaca, serta waktu pembaruan. |
| Customer | 7 profil dengan kontak fiktif, catatan, rating, riwayat dan total belanja; tersedia profil baru tanpa riwayat dan akun nonaktif. |
| Petugas | 7 kru dengan keahlian, area, tanggal bergabung, rating, dan variasi kesiapan/training/nonaktif. |
| Laporan | Transaksi fiktif lintas minggu/bulan dengan nomor invoice serta variasi QRIS/transfer/tunai, untuk grafik dan CSV. |
| Pantau Petugas / Halaman Cleaner | Task tersimpan, popup dan link langsung, pengiriman simulasi, progres dan laporan dari order yang sama. |

Seed dibuat sekali. Record lama dan progres cleaner tidak direset ketika mode dinyalakan. Pemanggilan ulang tidak menggandakan seed, dan penghapusan lewat UI tetap tersimpan. Tiga pesanan baru `DEMO-CHECK-01`–`03` sengaja dibiarkan Menunggu Assign untuk dicoba pengguna.

## Pengujian

- Delapan halaman utama berhasil dimuat tanpa error daftar atau overflow horizontal pada desktop: [hasil](pages.json).
- FAQ sementara dibuat lewat popup, diubah, direfresh dan dibaca kembali, lalu dihapus. Record sementara tersebut sudah dibersihkan.
- Foto layanan `DEMO-SRV-06` diunggah melalui file chooser, disimpan, lalu dimuat kembali dari route media lokal setelah refresh. Kontrol gambar menunjukkan `complete=true` dan lebar asli 512 px.
- Promo UJILAMA20 diperiksa melalui UI dan terlihat sebagai Berakhir. Pengaturan promo tetap tersimpan secara lokal.
- Tugas contoh baru `DEMO-ACTIVE-06` dibuka melalui modal admin dan link langsung, dicoba pada 390 × 844 px, dilanjutkan dari perjalanan ke pengerjaan, lalu diselesaikan. Refresh mempertahankan laporan; status pengiriman **Simulasi Berhasil** dan admin juga menampilkan **Selesai**: [hasil](cleaner.json), [tampilan HP](cleaner-phone.jpg).
- Skenario lama `DEMO-ORD-01`–`03` serta tiga pesanan baru Menunggu Assign tidak dipakai untuk tes browser ini. Progres pengguna dipertahankan.
- `npm run check:demo` memeriksa autentikasi, relasi data, idempotensi seed, CRUD/persistensi, route dispatch yang tidak dikenal, laporan dan retry simulasi, media privat, reset terbatas, serta penolakan mode production. Seluruh tes memakai direktori sementara dan menolak request jaringan.
- Pemeriksaan akhir: `typecheck`, `format:check`, dan build produksi lolos. Sembilan kelompok tes mode admin serta 19 kelompok regresi cleaner lolos: [11 tes store](store-checks.json), [8 tes adapter](adapter-checks.json). Hasil lama di folder pengujian sebelumnya dipertahankan.

## Batas pemeriksaan

Tidak ada perubahan backend atau aplikasi mobile tim. Sumber data demo tidak dipakai pada production. Mode ini membantu menguji UI yang sudah tersedia; kekurangan tampilan/fitur dalam [audit PNG](../png-recheck-2026-10-16/README.md) tidak otomatis menjadi selesai. Data uji juga tidak membuktikan pembayaran, GPS/ETA, pengiriman WA, atau sinkronisasi mobile sungguhan.

Ketika `ADMIN_DEMO_ENABLED=false`, frontend kembali memakai `API_URL`; kondisi data/route fixture lama dan kesesuaian kontrak backend perlu diperiksa terpisah.
