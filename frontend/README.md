# Web Admin CleanGo

## Alur penggunaan

### 1. Login

Masuk dengan akun admin. Setelah berhasil, dashboard menampilkan ringkasan pesanan dan kegiatan operasional.

### 2. Kelola layanan dan kategori

Buka **Kelola Layanan** untuk menambah layanan, mengubah harga dan detail, atau menghapus layanan. Promo diatur lewat **Kelola Promo**.

Kategori bisa ditambah dan dihapus dari halaman yang sama. Jika kategori masih berisi layanan, centang **Hapus semua layanan dalam kategori ini** agar layanannya ikut dihapus. Jika kategorinya kosong, checklist berwarna abu-abu dan tidak bisa dipilih; kategorinya tetap bisa dihapus.

### 3. Siapkan petugas dan jadwal

Tambahkan data petugas beserta keahliannya di **Kelola Data Petugas**. Setelah itu, atur tanggal dan shift di **Kelola Jadwal** agar petugas bisa dipilih saat penugasan.

### 4. Proses pesanan

Pesanan berasal dari aplikasi pelanggan. Buka **Kelola Pesanan**, periksa detail pesanan, lalu pilih petugas yang jadwalnya sesuai. Gunakan pencarian dan filter untuk menemukan pesanan yang ingin diproses.

### 5. Pantau pekerjaan cleaner

Buka **Pantau Petugas** dari pesanan yang sudah diberi petugas. Link tugas bisa dibuka di browser HP.

Cleaner mengonfirmasi keberangkatan dan kedatangan, mengerjakan layanan, lalu mengisi laporan. Sebelum menyelesaikan tugas, cleaner mencentang pemeriksaan pekerjaan dan bisa menambahkan foto. Admin kemudian memeriksa progres dan laporan yang tersimpan.

### 6. Kelola customer dan FAQ

Di **Kelola Data Customer**, admin bisa melihat dan memperbarui data pelanggan. Pendaftaran pelanggan dilakukan dari aplikasi customer.

Di **Kelola FAQ**, admin bisa menambah, mengubah, atau menghapus pertanyaan dan jawaban yang ditampilkan kepada pelanggan.

### 7. Lihat laporan

Buka **Laporan**, pilih periode, lalu lihat rincian berdasarkan hari, customer, atau petugas. Gunakan ekspor CSV untuk mengunduh datanya.

### 8. Periksa riwayat aktivitas

Buka **Audit Log Admin** untuk mencari aktivitas berdasarkan admin, tanggal, dan jenis perubahan. Pilih detail aktivitas untuk melihat nilai sebelum dan sesudah perubahan.

### 9. Logout

Pilih **Keluar akun** setelah selesai menggunakan aplikasi.

## Saat mencoba demo

Gunakan akun `admin` / `admin` pada mode demo. Riwayat aktivitas dan pengiriman WhatsApp pada mode ini masih berupa simulasi. Untuk memakai data backend, jalankan API tim dan gunakan akun backend; riwayat audit server baru tersedia setelah API audit disiapkan.

## Menjalankan frontend dan backend

Halaman admin mengambil semua data dari API Express, jadi **backend harus hidup** sebelum
membuka dashboard. Kalau tidak, halaman gagal dengan 503
_"Layanan data belum dapat dihubungi"_ — itu artinya API tidak berjalan atau port-nya beda,
bukan bug tampilan.

```bash
# dari root repo: menyalakan backend + frontend sekaligus
npm run dev

# atau terpisah di dua terminal
npm run dev:backend     # backend, port dari backend/.env (contoh: 3101)
npm run dev:frontend    # frontend, http://127.0.0.1:3000
```

**Port harus cocok.** `frontend/.env.local` → `API_URL`, dan `backend/.env` → `PORT`.
Kalau `API_URL=http://127.0.0.1:3101/api`, backend harus `PORT=3101`. Setelah mengubah
salah satunya, restart proses yang bersangkutan (Next hanya membaca `.env.local` saat start).

Untuk memastikan cepat:

```bash
# apakah API hidup di port yang dipanggil frontend?
curl http://127.0.0.1:3101/api/services
```

Kalau 503 tetap muncul, cek log terminal Next: sekarang ada baris
`[api] gagal menghubungi <url> (<penyebab>)` yang menunjukkan URL dan alasan aslinya.
