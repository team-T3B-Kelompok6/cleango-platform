# Pengujian dua pesanan dummy — 17 Oktober 2026

Pengujian dilakukan melalui UI pada data demo utama atas permintaan pengguna, memakai CL-9004 dan CL-9005 dari empat pesanan yang baru ditambahkan. Tidak ada reset data atau pengiriman WhatsApp nyata.

| Pesanan | Customer | Petugas | Hasil |
| --- | --- | --- | --- |
| CL-9004 | Amanda Pratama | Dina Rahma | Selesai, laporan dan satu foto dummy tersimpan |
| CL-9005 | Bagas Wicaksono | Fajar Hidayat | Selesai, laporan tersimpan tanpa foto |

Kedua pesanan berjalan dari Menunggu Assign → Siap Berangkat → Menuju Lokasi → Sedang Dikerjakan → Selesai. CL-9006 dan CL-9007 tetap Menunggu Assign tanpa petugas.

## Hasil pemeriksaan

[24 pemeriksaan browser](checks.json) lulus. Cakupannya meliputi:

- Tanpa shift sesuai tanggal/jam, pilihan penugasan kosong. Untuk pengujian ditambahkan shift 17 Oktober: Dina pagi dan siang, Fajar siang. Jadwal lama tetap dipertahankan.
- Dina direkomendasikan berdasarkan keahlian Deep Cleaning. Saat baru assigned, profil tetap menunjukkan tugas aktif kosong. Saat berangkat, status Menuju Lokasi dan tugas aktif muncul otomatis.
- Dina dikeluarkan dari pilihan CL-9005 saat sedang menjalankan CL-9004 walaupun booking berbeda jam. CL-9005 lalu ditugaskan ke Fajar.
- Aktivitas kedua petugas tetap terpisah. Lokasi contoh Dina muncul di Pantau Petugas sebagai lokasi contoh, tanpa klaim GPS nyata.
- Laporan kosong ditolak. Foto dummy CL-9004 berhasil diunggah dan bertahan setelah reload, termasuk setelah selesai. Foto yang digunakan berasal dari aset demo `public/demo/service_deep_cleaning.jpeg`.
- Waktu aktual CL-9004 sama di halaman cleaner, kartu pesanan, dan detail pesanan: 20.10–20.11 WIB. Booking 08.00 WIB tetap tersimpan terpisah. CL-9005 juga selesai 20.10–20.11 WIB, dengan timestamp individu yang terpisah.
- Setelah selesai, profil Dina dan Fajar kembali Siaga & Tersedia dan tugas aktif kosong. CL-9005 menjadi urutan teratas sebagai aktivitas selesai terakhir.
- Customer Amanda: jumlah selesai 6 → 7 dan nilai Rp1.328.000 → Rp1.678.000, sesuai harga CL-9004 Rp350.000. Layanan favorit Deep Cleaning menjadi 4 pesanan selesai; kru langganan Raka tetap 5 pesanan selesai.
- Customer Bagas: jumlah selesai 4 → 5 dan nilai Rp909.000 → Rp1.089.000, sesuai harga CL-9005 Rp180.000. Layanan favorit Cuci Sofa & Kasur menjadi 3 pesanan selesai; kru langganan Dina tetap 3 pesanan selesai.

## Bug yang ditemukan dan diperbaiki

Hitungan tugas aktif di kartu Pantau Petugas sebelumnya menghitung semua penugasan yang belum selesai, termasuk tahap assigned. Kini hanya en_route/working yang dihitung; tanpa task individu, fallback memakai status pesanan Menuju Lokasi/Sedang Dikerjakan. Selesai/Batal selalu dikecualikan. Label fallback Menunggu Lokasi juga ditampilkan Siap Berangkat. Verifikasi pada CL-9002 yang masih assigned menunjukkan **0 tugas aktif · 1 penugasan**.

Tidak ditemukan masalah lain pada dua alur yang diuji. Hasil ini terbatas pada mode demo; backend tim, GPS nyata, dan pengiriman WhatsApp nyata belum diuji end to end.

## Pemeriksaan kode dan bukti

- `npm run check:demo`: 14 kelompok lulus, tanpa permintaan eksternal.
- `npm run format:check`, `npm run build`, dan `npm run typecheck`: lulus.
- [Dua pesanan selesai dan sisa pesanan menunggu](dua-pesanan-selesai.jpg).
- [Laporan dan foto dummy tetap tersimpan](laporan-dan-foto-tersimpan.jpg).
