# Perbandingan Figma dan web terbaru

Acuan: [Figma CleanGo fix](https://www.figma.com/design/1lr9CMyydP3dI6axuKAUg6/CleanGo-fix?node-id=4002-7854), PNG besar yang diberikan pengguna, serta frame yang sudah disimpan pada [audit Figma](../figma-comparison-2026-10-16/README.md). Screenshot web di bawah diambil 16 Oktober 2026 pada mode demo, lebar 1280 px; jumlah order/nama/harga sengaja berbeda karena memakai data uji.

Ini perbandingan struktur dan kelengkapan, bukan klaim pixel-perfect. Revisi pengguna mengutamakan logo panda asli, teks terbaca, gaya konsisten, popup tetap ada, tanpa create order/jadwal dari admin, dan posisi promo yang sudah disepakati. Acuan mobile membantu memeriksa data/alur, tidak menjadi izin mengubah proyek Flutter teman.

## Ringkasan per halaman

| Halaman | Sudah ada / sudah diuji | Masih kurang terhadap Figma |
| --- | --- | --- |
| Login | Form, error, password visibility, bantuan, login/logout dan sesi. | Dekorasi/ilustrasi error berbeda. Tidak ditambah social login yang belum ada alurnya. |
| Dashboard | Sidebar/header, empat ringkasan, pengumuman SOP, aktivitas terbaru dan link detail. | Popup timeline aktivitas khusus, profil admin lengkap, beberapa aksen/kerapatan Figma. Data saat ini belum mewakili pembayaran nyata. |
| Pesanan | Status/tanggal/pencarian, popup detail/edit, assignment, hapus, akses Pantau. Titik tiga dihapus dan trash terpusat sesuai revisi. | Kartu pemilihan kru berfoto/rating/jarak/rekomendasi dan slot waktu terstruktur. Timeline status/pembayaran butuh API. |
| Jadwal | Daftar/status, kalender, popup detail/edit, hapus. Jam tiga shift sekarang konsisten. | Roster/kuota per shift, kapasitas, cuti/training pekerja, pindah pesanan antarshift. Create shift pada Figma tidak dijadikan create booking karena batas lingkup pengguna. |
| Layanan | Foto, harga/promo, fasilitas, active, kategori, detail popup, CRUD. Banner di samping tambah layanan; Kelola Promo di samping tambah kategori. | Detail layanan dua kolom lengkap, Preview HP, ulasan/metric, pengelolaan banner yang sudah ada. Tambah banner baru sudah tersedia. |
| FAQ | Background konsisten, kategori/pencarian, CRUD dan popup pratinjau. | Prioritas/urutan tampil, penghitung karakter, komposisi editor Figma, alur QC. Metadata hanya ditampilkan jika ada data. |
| Customer | Kontak/alamat/status, summary bila tersedia, popup detail dan CRUD manual. | Editor catatan khusus, layanan/kru favorit secara eksplisit; statistik dan relasi yang akurat membutuhkan API. |
| Petugas | Keahlian/status, detail popup, edit, tugas aktif, kontak WA/link pada nomor valid. | Field detail/metric seperti tanggal bergabung dan kondisi fisik belum lengkap pada editor. Nomor dummy sengaja tidak membuka WA sungguhan. |
| Laporan | Ringkasan, grafik, empat tab, periode, popup rincian dan CSV. | Invoice item/add-on/voucher/pembayaran lengkap, cetak/kirim invoice, PDF/XLSX dan pemilih periode kaya Figma. “Selesai” belum berarti “lunas”. |

## 1. Login

| Figma | Web demo |
| --- | --- |
| ![Login Figma](../figma-comparison-2026-10-16/figma-login.png) | ![Login web](screenshots/login-1280.jpg) |

## 2. Dashboard

| Figma | Web demo |
| --- | --- |
| ![Dashboard Figma](../figma-comparison-2026-10-16/figma-dashboard.png) | ![Dashboard web](screenshots/dashboard-1280.jpg) |

## 3. Kelola Pesanan

| Figma | Web demo |
| --- | --- |
| ![Pesanan Figma](../figma-comparison-2026-10-16/figma-pesanan.png) | ![Pesanan web](screenshots/pesanan-1280.jpg) |
| ![Popup pesanan Figma](../figma-comparison-2026-10-16/figma-pesanan-popup.png) | ![Popup pesanan web](screenshots/pesanan-detail-1280.jpg) |

## 4. Kelola Jadwal

| Figma | Web demo |
| --- | --- |
| ![Jadwal Figma](../figma-comparison-2026-10-16/figma-jadwal.png) | ![Jadwal web](screenshots/jadwal-1280.jpg) |
| ![Popup jadwal Figma](../figma-comparison-2026-10-16/figma-jadwal-popup.png) | ![Popup jadwal web](screenshots/jadwal-detail-1280.jpg) |

## 5. Kelola Layanan

| Figma | Web demo |
| --- | --- |
| ![Layanan Figma](../figma-comparison-2026-10-16/figma-layanan.png) | ![Layanan web](screenshots/layanan-1280.jpg) |
| ![Editor layanan Figma](../figma-comparison-2026-10-16/figma-layanan-popup.png) | ![Form layanan web](screenshots/layanan-form-1280.jpg) |

Foto contoh berasal dari salinan aset aplikasi mobile yang disediakan tim. Unggah foto di form dan persistensi diuji; sinkronisasi ke aplikasi customer belum dibuktikan.

## 6. Kelola FAQ

| Figma | Web demo |
| --- | --- |
| ![FAQ Figma](../figma-comparison-2026-10-16/figma-faq.png) | ![FAQ web](screenshots/faq-1280.jpg) |
| ![Popup FAQ Figma](../figma-comparison-2026-10-16/figma-faq-popup.png) | ![Popup FAQ web](screenshots/faq-detail-1280.jpg) |

## 7. Kelola Data Customer

| Figma | Web demo |
| --- | --- |
| ![Customer Figma](../figma-comparison-2026-10-16/figma-customer.png) | ![Customer web](screenshots/customer-1280.jpg) |
| ![Popup customer Figma](../figma-comparison-2026-10-16/figma-customer-popup.png) | ![Popup customer web](screenshots/customer-detail-1280.jpg) |

Popup customer pada screenshot memakai record sementara tanpa riwayat, sehingga statistik kosong adalah keadaan uji yang sah; jangan mengisi angka Figma seolah transaksi nyata.

## 8. Kelola Data Petugas

| Figma | Web demo |
| --- | --- |
| ![Petugas Figma](../figma-comparison-2026-10-16/figma-petugas.png) | ![Petugas web](screenshots/petugas-1280.jpg) |

Popup petugas diuji pada record sementara; bukti desain/detail sebelumnya ada pada [detail petugas](../staff-detail-2026-10-15/README.md) dan [popup detail](../detail-popups-2026-10-15/README.md).

## 9. Laporan Keuangan & Operasional

| Figma | Web demo |
| --- | --- |
| ![Laporan Figma](../figma-comparison-2026-10-16/figma-laporan.png) | ![Laporan web](screenshots/laporan-1280.jpg) |

## Halaman cleaner dan Pantau

Acuan cleaner dari PNG pengguna tersedia pada [tampilan awal](../png-recheck-2026-10-16/reference/cleaner-start.png) dan [pengerjaan](../png-recheck-2026-10-16/reference/cleaner-working.png). Halaman web memakai task/order yang sama dengan admin; status delivery simulasi ditulis jelas. Tombol Berangkat Sekarang berada dalam aliran form sesuai revisi terbaru.

| Bagian atas HP 360 px | Setelah scroll, tombol mengikuti form |
| --- | --- |
| ![Cleaner atas](screenshots/cleaner-phone-top-360.jpg) | ![Cleaner tombol](screenshots/cleaner-phone-button-360.jpg) |

Yang masih membutuhkan integrasi: GPS nyata/live map/rute/ETA, deteksi tiba otomatis, WA sungguhan dan media otomatis, serta sinkronisasi status customer mobile. Konfirmasi tiba manual tersedia agar status tidak otomatis diklaim hanya berdasarkan contoh peta.

## Bukti responsif

Semua sembilan halaman mempunyai screenshot `*-360.jpg`, `*-768.jpg`, dan `*-1280.jpg` di [folder screenshot](screenshots/). [responsive.json](responsive.json) mencatat hasil geometrinya. Logo, jumlah data dan ukuran teks yang berbeda dari PNG tidak otomatis merupakan bug: sebagian mengikuti revisi pengguna dan kebutuhan keterbacaan.

Audit lama port 4400 tetap disimpan sebagai riwayat. Pada mode demo terbaru, halaman pesanan default dapat dibuka tanpa pencarian khusus; error fixture lama tidak direproduksi dan tidak dipakai sebagai bukti masalah backend tim.
