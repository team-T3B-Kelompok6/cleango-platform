# Pemeriksaan popup admin — 16 Oktober 2026

Revisi visual mengikuti permintaan untuk popup yang lebih sederhana dan konsisten. Tidak ada perubahan backend, model data, atau pengiriman pesan. Data pengguna tidak dibuat, dihapus, di-reset, atau diubah selama pemeriksaan ini; tombol konfirmasi hapus hanya dibuka lalu dibatalkan.

## Perubahan

- Ukuran mengikuti fungsi: konfirmasi hapus dan kategori 480 px, dialog biasa 560 px, detail 660 px, form layanan 740 px, serta daftar promo/Pantau 1040 px. Ukuran dibatasi viewport.
- Penugasan tidak lagi memakai tinggi tetap yang meninggalkan ruang kosong. Pantau dari pesanan memakai satu kolom dan tetap terkunci pada pesanan tersebut.
- Pratinjau cleaner memakai tinggi yang cukup untuk iframe, dengan area scroll ketika kontrol dan halaman tidak muat. Popup lokasi bertingkat tidak mewarisi lebar popup induk.
- Header, tombol tutup, footer, field, border, dan radius disamakan. Ikon netral, konfirmasi hapus merah, tanpa dekorasi maskot atau judul bagian dengan huruf kapital berlebihan.
- Detail customer/petugas memakai pola Tutup dan Ubah yang sama. Ubah merupakan tindakan utama; menutup ringkasan tidak lagi ditampilkan sebagai tombol hijau dengan ikon centang.
- Judul FAQ disederhanakan menjadi Detail FAQ, Pertanyaan, dan Jawaban. Keterangan banner dan konfirmasi promo dipersingkat.
- Rincian laporan mempunyai footer Tutup/Buka Pesanan. Konfirmasi hapus jadwal menampilkan nama petugas, tanggal, dan jam agar record yang dipilih jelas.
- ID popup penugasan dan editor menampilkan kode operasional pendek; ID penyimpanan tetap sama.
- Ringkasan SOP tetap dapat di-scroll pada layar pendek; tab dan informasi prosedur dipertahankan.

## Cakupan pemeriksaan browser

| Kelompok | Varian yang dibuka pada desktop 1280 px dan HP 360 px |
| --- | --- |
| Pesanan | Detail, ubah, hapus, tugaskan petugas |
| Jadwal petugas | Tambah, detail, ubah, hapus |
| Layanan | Tambah, detail, ubah, hapus, tambah kategori |
| FAQ | Tambah, detail, ubah, hapus, tambah kategori |
| Customer | Detail, ubah, hapus |
| Petugas | Tambah, detail, ubah, hapus |
| Promo | Daftar, tambah, ubah, konfirmasi hapus, tambah banner |
| Pantau | Daftar seluruh petugas, khusus pesanan, lokasi, pratinjau cleaner |
| Laporan | Rincian pesanan selesai dan tombol Tutup |
| Panduan | SOP ringkasan dan tab serah terima; Escape menutup dialog |

Navigasi, notifikasi, menu akun, dan filter tanggal juga diperiksa pada HP. Tidak ditemukan overflow horizontal pada dialog yang diperiksa; header/footer berada dalam viewport dan tombol bawah terlihat. Detail dan editor tetap terpisah. Hapus promo dibatalkan tanpa mutasi data. Dialog bertingkat ditutup kembali tanpa membuka daftar petugas lain.

Form jadwal, layanan, kategori, promo, serta konfirmasi hapus juga diperiksa pada tablet 768 px. Pengukuran akhir tersimpan pada [final-browser-checks.jsonl](final-browser-checks.jsonl), dan pemeriksaan popover pada [popover-checks.json](popover-checks.json). Iframe cleaner pada pemeriksaan akhir memiliki tinggi 336 px di desktop dan 280 px pada HP; tidak lagi hanya bergantung pada ukuran bawaan iframe.

[Production build](build.txt) dan [format](format.txt) lolos. TypeScript juga lolos. Pengujian ini memeriksa frontend dengan adapter demo, bukan integrasi backend tim.

## Contoh hasil

- [Detail customer](detail-customer.jpg) · [Detail petugas](detail-petugas.jpg) · [Detail FAQ](detail-faq.jpg).
- [Form layanan](tambah-layanan.jpg) · [Form layanan HP](tambah-layanan-hp.jpg) · [Form jadwal](ubah-jadwal.jpg).
- [Penugasan](tugaskan-petugas.jpg) · [Pantau khusus pesanan](pantau-pesanan.jpg).
- [Hapus promo](hapus-promo.jpg) · [Hapus layanan](hapus-layanan.jpg) · [Rincian laporan](rincian-laporan.jpg).

Screenshot pratinjau cleaner beserta URL token sengaja tidak disimpan; pemeriksaan dilakukan langsung di browser.
