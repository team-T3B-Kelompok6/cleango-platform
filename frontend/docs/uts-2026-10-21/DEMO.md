# Urutan demo aplikasi — tanpa PPT

Jalankan frontend development dengan `ADMIN_DEMO_ENABLED=true`; buka [aplikasi lokal](http://127.0.0.1:3000). Akun contoh: **admin / admin**. Gunakan data uji, bukan data produksi.

1. Login, lalu tunjukkan sembilan navigasi sidebar dan ringkasan dashboard.
2. Buka Kelola Layanan: tambah layanan dengan nama, kategori, harga, durasi, deskripsi, dan fasilitas. Simpan, refresh, ubah harga, lalu hapus data uji.
3. Buka Hapus kategori: kategori berisi layanan memerlukan checklist hapus semua layanan; kategori kosong menonaktifkan checklist. Perubahan data bersifat destruktif; gunakan kategori uji.
4. Tunjukkan detail dan form pesanan, jadwal, customer, FAQ, dan petugas. Customer berasal dari aplikasi pelanggan; admin tidak mendaftarkannya.
5. Buka Pantau Petugas pada penugasan uji, lalu halaman cleaner. Pada lebar ponsel, konfirmasikan tiba, isi laporan, centang pemeriksaan, dan selesaikan. Nyatakan pengiriman WhatsApp masih simulasi.
6. Buka Audit Log Admin. Cari aktivitas demo yang baru dibuat; tampilkan filter dan perbandingan sebelum/sesudah.
7. Buka Laporan: rincian harian, pelanggan, kru, dan unduh CSV.
8. Logout lalu coba membuka halaman admin untuk menunjukkan proteksi sesi.

## Untuk demonstrasi kondisi gagal

Jalankan fixture `npm run qa:api` dan frontend terpisah dengan `API_URL=http://127.0.0.1:4410/api`, `ADMIN_DEMO_ENABLED=false`. Fixture ini alat pengujian, bukan backend tim.

Kontrol fixture loopback:

```powershell
Invoke-RestMethod -Method Post 'http://127.0.0.1:4410/__qa/mode?value=empty'
Invoke-RestMethod -Method Post 'http://127.0.0.1:4410/__qa/mode?value=error'
Invoke-RestMethod -Method Post 'http://127.0.0.1:4410/__qa/mode?value=normal'
Invoke-RestMethod -Method Post 'http://127.0.0.1:4410/__qa/mode?value=slow'
Invoke-RestMethod -Method Post 'http://127.0.0.1:4410/__qa/mode?value=expired'
Invoke-RestMethod -Method Post 'http://127.0.0.1:4410/__qa/mode?value=audit-unavailable'
Invoke-RestMethod -Method Post 'http://127.0.0.1:4410/__qa/mode?value=audit-error'
```

Mode `audit-unavailable` dan `audit-error` hanya mengubah respons audit menjadi 404 atau 503; modul lain tetap berjalan agar keadaan khusus halaman audit dapat diuji.

Selalu kembalikan fixture ke `normal` setelah demo. Jangan menyatakan simulasi WhatsApp, data contoh, atau fixture sebagai layanan produksi yang sudah tersambung.
