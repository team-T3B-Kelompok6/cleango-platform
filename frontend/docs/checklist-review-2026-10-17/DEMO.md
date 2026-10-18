# Panduan demo frontend tanpa API tim

1. Dari folder frontend, jalankan `npm ci` dan salin `.env.example` menjadi `.env.local`.
2. Aktifkan `ADMIN_DEMO_ENABLED=true` pada development, lalu jalankan `npm run dev`.
3. Buka localhost:3000 dan masuk dengan admin / admin. Data demo tidak mengirim WhatsApp sungguhan.
4. Tunjukkan dashboard dan seluruh sidebar, lalu tambah/ubah layanan beserta foto dan fasilitas.
5. Buat shift untuk petugas terdaftar pada tanggal dan rentang jam booking. Buka pesanan Menunggu Assign dan pilih petugas yang tersedia; rekomendasi berdasarkan keahlian.
6. Dari Pantau Petugas buka halaman tugas. Jalankan Berangkat, Tiba & Mulai, isi laporan dan konfirmasi pemeriksaan, lalu selesaikan. Foto opsional.
7. Periksa perubahan status, waktu aktual, tugas aktif petugas, ringkasan customer, dan urutan aktivitas pesanan.
8. Tunjukkan tab laporan serta CSV. Akhiri dengan logout.

Untuk menguji HP fisik, gunakan panduan jaringan pada README frontend; hasil checklist ini sendiri memakai emulasi lebar 360/768/1280 di browser. Jangan membagikan token link tugas atau file environment.

Pemeriksaan ulang: `npm run check:demo`, `npm run check:promo`, `npm run format:check`, `npm run build`, dan `npm run typecheck`. Pengujian HTTP terisolasi memakai `npm run qa:api`, lalu `npm run check:uts:http -- --checklist`; fixture ini bukan API tim.

API tim belum diterima pemilik frontend. Demo lokal, fixture, dan build yang berhasil tidak menggantikan pengujian integrasi produksi. Tidak ada presentasi/PPT dalam pekerjaan ini.
