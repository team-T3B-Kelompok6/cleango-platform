# Penyesuaian font dan jarak teks — 14 Oktober 2026

Ukuran teks yang diperbesar sebelumnya masih memiliki beberapa tinggi baris tetap. Aturan tersebut diganti dengan tinggi baris proporsional pada navigasi, kartu data, judul bagian, form, dan dialog.

Setelah screenshot Figma asli dikirim, tulisan logo diseragamkan menjadi 20 px dengan tagline 11 px dan jarak 4 px. Tagline tetap satu baris pada sidebar desktop. Profil admin memakai nama 15 px dan peran 11 px dengan jarak 3 px. Logo panda tetap mengikuti aset yang diminta pengguna. Aktivitas pesanan memakai jarak 6 px antara alamat, nama layanan, dan informasi penugasan; padding vertikal kartu 18 px.

DM Sans dipakai untuk isi, kontrol, dan judul kartu. Plus Jakarta Sans tetap dipakai untuk judul halaman dan bagian. Judul kartu memakai bobot 600, sedangkan jarak huruf judul utama dibuat lebih longgar. Font tetap dimuat melalui Next Font.

## Pemeriksaan

- Sepuluh tampilan diperiksa pada 1280×900, 768×1024, 360×800, dan 800×360. Tidak ada halaman meluber horizontal. Teks paragraf, heading, label, dan small yang terlihat tidak memiliki tinggi baris di bawah 1,15 kali ukuran font.
- Popup Ubah pada enam menu diperiksa pada desktop, ponsel, dan landscape. Seluruh dialog dan footer tetap berada dalam layar.
- Ringkasan SOP tetap menampilkan seluruh bagian yang berlaku pada setiap ukuran layar. Rincian tahap tetap tersedia pada tab terpisah.
- Build produksi, TypeScript, format kode, dan diff whitespace lolos.

Hasil terukur: [halaman dan font](pages.json), [dialog](dialogs.json). Screenshot setiap halaman memakai akhiran `-1280.png` dan `-360.png`.

Detail setelah penyesuaian acuan Figma: [logo](brand-figma.png), [profil admin](profile-figma.png), dan [pemeriksaan komponen](figma-reference-check.json). Ukuran diperkirakan dari screenshot; nama font asli Figma belum diverifikasi dari layer.

Pengujian menggunakan API preview lokal; revisi ini hanya mengubah tipografi dan jarak tampilan frontend.
