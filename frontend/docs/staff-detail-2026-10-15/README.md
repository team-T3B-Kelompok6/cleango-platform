# Detail petugas — 15 Oktober 2026

Detail Petugas tampil sebagai popup di atas Kelola Data Petugas, mengikuti hierarki screenshot Figma yang diberikan. Ukuran dan jarak diperkirakan dari screenshot, memakai font, token warna, dan komponen dialog proyek.

## Perubahan

- Profil ringkas dengan inisial, nama, ID, nomor WhatsApp, status, dan rating bila tersedia.
- Kartu keahlian, area operasional, tanggal bergabung, serta jumlah jadwal yang tercatat.
- Tugas aktif dari pesanan yang ditugaskan, tautan detail pesanan, dan pencarian seluruh jadwal petugas.
- Hubungi WhatsApp membuka tautan dengan draf pesan. Salin tautan menyalin URL yang sama. Pengiriman pesan tetap dilakukan oleh admin.
- Edit Data Petugas beralih ke form pada popup yang sama. Batal kembali ke profil; simpan kembali ke daftar dengan notifikasi berhasil.
- Header dan footer tetap terlihat, hanya bagian isi yang digulir. X, Tutup, dan Escape kembali ke daftar.

Rating, tanggal bergabung, keahlian, dan penugasan memakai data API. Tidak ada angka kehadiran/kepuasan dari contoh Figma. Field kosong ditandai sesuai keadaan datanya.

## Pemeriksaan

Pengujian interaksi memakai API preview lokal terpisah pada port 4400. Data petugas khusus pengujian sudah dihapus setelah pemeriksaan; data petugas awal dipertahankan.

| Pemeriksaan | Hasil |
| --- | --- |
| Klik Detail dari daftar dan membuka URL detail langsung | Popup terbuka di atas daftar |
| Nomor lokal, awalan negara, format internasional, dan nomor tidak valid | 18 kasus normalisasi lulus |
| URL tanpa draf, nomor tidak valid, dan encoding draf pesan | 3 pemeriksaan tautan lulus |
| Salin tautan | Isi clipboard sama dengan href Hubungi WhatsApp |
| Profil lengkap dan data opsional kosong | Ditampilkan tanpa statistik contoh |
| Nomor tidak valid | Tombol kontak dinonaktifkan, tombol salin tidak ditampilkan |
| API jadwal gagal | Profil tetap terbuka dengan pesan belum dapat dimuat |
| API orders gagal pada layout notifikasi | Halaman error bersama tampil, sesuai perilaku layout yang sudah ada |
| Edit, Batal, dan fokus keyboard | Satu dialog; fokus menuju form lalu kembali ke Edit |
| Simpan perubahan | Nama tersimpan melalui Server Action, kembali ke daftar dengan pesan berhasil |
| X, Tutup, Escape | Dialog ditutup dan kunci gulir halaman dilepas |
| Detail tugas aktif | Membuka pesanan yang benar dan melepas kunci gulir |
| Desktop 1280×900, tablet 768×1024, ponsel 360×800 dan 320×640, landscape 800×360 | Tidak ada luapan horizontal; dialog dan tombol berada dalam layar |
| PageDown pada isi popup | Isi bergulir; posisi header, footer, dan halaman belakang tetap |
| Maskot pada catatan | Aset lokal termuat, rasio 1:1 |
| TypeScript dan build produksi | Lulus |

Dimensi hasil pemeriksaan ada di [responsive.json](responsive.json). Bukti tampilan: [desktop](desktop.png) dan [ponsel](mobile.png). Mode reduced motion browser dihormati; animasi pada kecepatan normal tidak dinilai secara visual dalam pemeriksaan ini.

Perubahan terbatas pada frontend. Tautan WhatsApp tidak memerlukan endpoint kirim pesan atau perubahan aplikasi mobile.
