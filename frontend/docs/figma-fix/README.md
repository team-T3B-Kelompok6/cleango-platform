# Penyesuaian desain CleanGo

Pemeriksaan 10 Oktober 2026 memakai [CleanGo fix](https://www.figma.com/design/1lr9CMyydP3dI6axuKAUg6/CleanGo-fix?node-id=4002-7854). Halaman web diperiksa satu per satu melalui prototype. Ukuran, warna, dan jarak diperkirakan secara visual karena detail layer serta aset asli belum tersedia lengkap. Desain ini masih dapat berubah.

## Perbandingan halaman

Screenshot acuan menampilkan keseluruhan frame dalam viewer prototype. Screenshot web memakai viewport desktop 1280×820; halaman yang lebih panjang ditangkap penuh. Jumlah data mengikuti API uji, sehingga berbeda dari angka contoh di Figma.

| Halaman   | Frame Figma | Acuan                      | Web                                     |
| --------- | ----------- | -------------------------- | --------------------------------------- |
| Login     | 4002:8144   | [Prototype](login.jpg)     | [Screenshot](result/login-1280.jpg)     |
| Dashboard | 4002:7857   | [Prototype](dashboard.jpg) | [Screenshot](result/dashboard-1280.jpg) |
| Pesanan   | 4002:8223   | [Prototype](pesanan.jpg)   | [Screenshot](result/pesanan-1280.jpg)   |
| Jadwal    | 4002:8581   | [Prototype](jadwal.jpg)    | [Screenshot](result/jadwal-1280.jpg)    |
| Layanan   | 4002:8932   | [Prototype](layanan.jpg)   | [Screenshot](result/layanan-1280.jpg)   |
| FAQ       | 4002:10985  | [Prototype](faq.jpg)       | [Screenshot](result/faq-1280.jpg)       |
| Customer  | 4002:9608   | [Prototype](customer.jpg)  | [Screenshot](result/customer-1280.jpg)  |
| Petugas   | 4002:9260   | [Prototype](petugas.jpg)   | [Screenshot](result/petugas-1280.jpg)   |
| Laporan   | 4002:9872   | [Prototype](laporan.jpg)   | [Screenshot](result/laporan-1280.jpg)   |

## Perubahan

- Lebar sidebar, jarak konten, radius kartu, dan ukuran teks diseragamkan. Bayangan kartu dibuat lebih ringan.
- Login memakai kartu tengah, logo, ikon input, bantuan, dan tips sesuai susunan prototype. Tautan lupa kata sandi dihapus; akun demo tetap admin/admin sesuai kebutuhan proyek.
- Header pesanan menampilkan filter tanggal seperti prototype. Sesuai pembagian tugas terbaru, pesanan dan jadwal dibuat melalui aplikasi pelanggan: tombol serta route tambah keduanya dihapus. Menu layanan, petugas, customer, dan FAQ tetap menyediakan tombol tambah.
- Kalender pesanan dan jadwal menampilkan jumlah data per hari dari API. Mendukung tanggal tunggal, rentang, input tanggal manual, perpindahan bulan, hari ini, dan reset. Filter tetap tersimpan di URL.
- Popup turun dari tombol pada layar normal. Jika ruang atas dan bawah terlalu kecil, kalender tampil di tengah layar. Isi kalender dapat digulir, sementara header dan footer tetap terlihat.
- Tab Batal tersedia pada pesanan dan form perubahan status. Nilai ini dicantumkan dalam kontrak API.
- Tab Masa Training dan status form petugas mengikuti prototype. Status Nonaktif tetap tersedia sebagai pilihan tersendiri; tabnya muncul ketika ada data nonaktif atau filter Nonaktif sedang dibuka. Petugas training tidak ditawarkan untuk penugasan baru; petugas yang sudah tercatat pada pesanan tetap dipertahankan dalam detailnya.
- Detail pesanan memuat ringkasan pelanggan dan ikon pada header. Ukurannya tetap melebar dengan tinggi yang sama seperti penugasan petugas; footer berada di luar isi yang digulir.
- Judul kelompok jadwal memuat jam shift. Slot kosong menjelaskan bahwa jadwal mengikuti pesanan pelanggan.
- Animasi tab, dialog, serta notifikasi dipertahankan, dengan dukungan preferensi reduced motion. Escape mengembalikan fokus ke tombol pemicu popup.

## Pemeriksaan

Sembilan halaman diperiksa pada 1280×820, 768×1024, 360×800, dan landscape 800×360: **36 pemeriksaan layout tanpa overflow horizontal halaman**. Tab panjang menggunakan scroll di dalam wadahnya. Gambar lokal tidak ditemukan rusak.

Sebanyak **28 pemeriksaan interaksi lolos**, meliputi pergantian status tanpa perubahan lebar halaman, penerapan rentang tanggal ke URL, tanggal kabisat, reset/hari ini, navigasi ponsel, Escape, notifikasi, tinggi tetap tab SOP, ringkasan SOP tanpa scroll, footer detail tetap, perubahan status Batal, filter Masa Training, pengecualian petugas training dari pesanan baru, serta riwayat petugas pada detail pesanan. Login admin/admin juga diperiksa melalui Server Action. Perubahan data uji dikembalikan setelah pemeriksaan.

Build produksi, TypeScript, dan format kode lolos. Bukti tersedia di [build](build.txt), [hasil pemeriksaan](qa.json), dan [screenshot](result/).

## Batas integrasi

Pekerjaan ini hanya frontend admin Next.js. API uji berada di luar repositori dan tidak menggantikan Express/database tim. Pengujian ini belum membuktikan penyimpanan database atau integrasi mobile.

Kontrak status petugas mencakup `Tersedia`, `Bertugas`, `Masa Training`, dan `Nonaktif`. Rating, keahlian, statistik pembaca FAQ, paket favorit, dan metode pembayaran mengikuti field API; ketika belum tersedia, halaman menampilkan keterangannya.

Tracking tetap simulasi berlabel, sesuai cakupan frontend. SVG logo, ikon, dan ilustrasi panda lokal digunakan kembali; kesamaan aset ilustrasi dengan Figma belum diverifikasi dari file aslinya. Nilai transaksi dihitung dari data pesanan, tanpa menyalin angka ringkasan contoh yang berulang dalam desain.
