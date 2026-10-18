# Panduan uji manual CleanGo

## Persiapan

Di `frontend/.env.local` aktifkan `ADMIN_DEMO_ENABLED=true` untuk development. Jalankan `npm run dev`, buka `http://127.0.0.1:3000`, lalu login **admin / admin**. Data uji tersimpan lokal; hasilnya belum membuktikan integrasi MySQL/provider WA.

Gunakan nama `[UJI DEMO]` bila menambah data untuk pengujian. Gunakan nomor `0000000000` dan email `example.test`. Perubahan form demo bertahan setelah refresh. Data uji yang sedang dipakai pengguna tidak direset oleh tes UTS.

## Urutan pengujian

| Langkah | Halaman/tindakan | Yang diperiksa |
| --- | --- | --- |
| 1 | Login; buka dashboard. | Penanda mode demo, ringkasan order dan navigasi. |
| 2 | Layanan → Tambah/Ubah. | Foto, kategori, fasilitas, harga dasar/promo dan active. Banner di sebelah tambah layanan; Kelola Promo di sebelah tambah kategori. |
| 3 | Pesanan → Menunggu Assign → Tugaskan Petugas. | Pilih petugas [UJI] tersedia dan simpan. Pesanan dibuat dari mobile, admin menugaskan. |
| 4 | Pantau Petugas → Buka Halaman Petugas. | Popup tetap di admin; status pengiriman terpisah, Salin Link dan Kirim Ulang. |
| 5 | Link cleaner pada viewport HP/tab langsung. | Info customer/alamat/jadwal, Berangkat Sekarang → konfirmasi tiba/mulai → isi ringkasan ≥10 karakter, centang pemeriksaan → Selesai & Kirim Laporan. Foto opsional. Refresh untuk memeriksa persistensi. |
| 6 | Kembali Pantau Petugas dan laporan. | Status pekerjaan selesai berbeda dari status pengiriman. CSV dapat diunduh. |
| 7 | FAQ/customer/petugas detail; logout. | Popup detail dapat dibuka dan ditutup; setelah logout halaman admin meminta login. |

## Skenario sukses dan kegagalan

`DEMO-ORD-01` menguji sukses, `DEMO-ORD-02` sengaja gagal link pertama, `DEMO-ORD-03` sengaja gagal report pertama. Tombol **Siapkan 3 Pesanan Uji** tidak menggandakan atau mengulang progres yang sudah ada. **Ulangi Data Uji** mereset tiga order tersebut dan mencabut link/foto lama; gunakan hanya bila ingin memulai tiga skenario dari awal. Katalog dan order lain dipertahankan.

`DEMO-CHECK-01..03` adalah contoh awal Menunggu Assign. Jika sudah pernah ditugaskan, status akan tetap seperti hasil pengujian sebelumnya. Jangan menjanjikan semua sample selalu kembali awal saat refresh.

Untuk skenario gagal: tunjukkan penugasan/laporan tetap tersimpan, klik kirim ulang, dan baca label **Simulasi Berhasil**. Jangan menekan kontak orang sungguhan selama demo. Pesan Boo dipilih satu kali berdasarkan assignment, tetap sama saat refresh; penugasan baru memilih pesan kembali, tanpa carousel otomatis.

## Mencoba pada HP fisik

Pengujian UTS pada paket ini memakai viewport browser 360 px, belum HP fisik. Untuk uji HP:

1. Sambungkan HP dan komputer ke Wi-Fi yang sama.
2. Jalankan `npm run dev:lan` bila memang ingin membuka server ke jaringan lokal.
3. Isi `APP_PUBLIC_URL=http://<IP-LAN-komputer>:3000`, restart, kemudian salin link tugas baru.
4. Buka link tersebut di browser HP. `localhost`/`127.0.0.1` pada HP merujuk HP sendiri.
5. GPS nyata memerlukan HTTPS/konteks aman dan izin pengguna. Data dummy menyediakan GPS simulasi agar demonstrasi tidak bergantung pada posisi asli.

Jika link tidak tersedia, pastikan mode demo aktif dan petugas sudah ditugaskan; buka Pantau ulang. Bila backend nyata belum menyediakan cleaner API, gunakan tugas [UJI] dan katakan bahwa data produksi masih menunggu integrasi. Jangan menutupi error dengan label Terkirim palsu.

