# Pemeriksaan penugasan dan sinkronisasi — 17 Oktober 2026

Tugas aktif profil petugas hanya berasal dari tahap individu menuju lokasi atau bekerja. Penugasan yang belum berangkat, shift mendatang, pesanan batal, dan pekerjaan selesai tidak mengisi tugas aktif. Status petugas dan pesanan memakai rekaman cleaner yang sama.

- Daftar pesanan memakai aktivitas terbaru, termasuk penyuntingan, penugasan, keberangkatan, dan penyelesaian. Membuka detail tidak menaikkan urutan.
- Label lama Menunggu Lokasi ditampilkan Siap Berangkat; keberangkatan tampil Menuju Lokasi.
- Penugasan memerlukan shift terdaftar yang mencakup tanggal/jam booking. Petugas sibuk, training, nonaktif, atau tanpa shift tidak ditawarkan. Reservasi yang bertumpuk tetap ditolak. Tahap individu membedakan kru yang masih assigned, sedang bekerja, dan sudah selesai pada satu pesanan tim.
- Kandidat Direkomendasikan berasal dari kecocokan keahlian layanan. Rekomendasi tidak melewati aturan shift dan ketersediaan. Pencocokan kata mencegah keahlian AC cocok dengan kata Kaca.
- Nilai pesanan selesai, layanan favorit, dan kru langganan customer dihitung dari transaksi Selesai. Catatan customer tetap milik pesanan.
- Riwayat selesai tanpa rekaman tidak membuat waktu kerja baru. Tahap tanpa waktu tampil Tidak tercatat; laporan yang belum ada tidak disebut tersimpan. Link historis yang sudah ada mempertahankan progres, laporan, dan foto.

## Validasi

- `npm run check:demo`: 14 kelompok lulus, tanpa permintaan eksternal. Termasuk tahap individu kru, batas shift, keahlian, urutan aktivitas, dan larangan membuat rekaman palsu pada riwayat selesai.
- `npm run build`, `npm run typecheck`, dan `npm run format:check`: lulus.
- [Hasil browser](browser-checks.json): 16 pemeriksaan lulus. Alur diuji dari penugasan, berangkat, tiba, selesai, tersedianya kembali petugas, perubahan ringkasan customer, sampai urutan pesanan setelah edit. Pembacaan urutan yang sempat dilakukan sebelum navigasi simpan selesai disimpan sebagai observasi; pengujian ulang setelah halaman siap lulus.
- Screenshot diperiksa: [rekomendasi](rekomendasi-petugas.jpg), [tugas aktif kosong](petugas-tanpa-tugas-aktif.jpg), [ringkasan customer](customer-ringkasan-aktual.jpg), dan [riwayat tanpa waktu palsu](riwayat-tanpa-catatan-palsu.jpg).

Pengujian mutasi browser menggunakan server QA dan direktori data sementara terpisah. Data/progres/foto pada penyimpanan demo utama tidak direset. Server QA dihentikan setelah pemeriksaan; server utama tetap berjalan. Riwayat lama pada server utama diperiksa secara baca saja.

Integrasi API tim dan pengiriman WhatsApp nyata belum divalidasi end to end. Persyaratan timestamp, transaksi atomik, dan tahap individu sudah diselaraskan pada [kontrak API](../API-CONTRACT.md).
