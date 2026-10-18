# Matriks pengujian UTS

Tanggal: 16 Oktober 2026. Browser lokal: Codex In-app Browser. UI memakai development demo di `localhost:3000`, terpisah origin cookie dari tab pengguna `127.0.0.1`. Pengujian ukuran memakai override viewport, bukan perangkat fisik. Semua kontak uji fiktif.

## Langkah dan hasil

| Area | Langkah yang dijalankan | Ekspektasi | Hasil |
| --- | --- | --- | --- |
| Login | Masukkan sandi salah, kemudian akun demo yang benar. | Error jelas lalu dashboard terbuka. | Lolos UI dan HTTP. |
| Logout | Klik Keluar akun, buka kembali `/pesanan`. | Login ditampilkan; data admin terlindungi. | Lolos UI. |
| Sidebar | Buka dashboard, pesanan, jadwal, layanan, FAQ, customer, petugas, laporan di 360/768/1280. | Halaman terbuka, navigasi aktif satu, tanpa overflow. | 24 kombinasi admin lolos. |
| Login responsif | Tampilkan login pada tiga lebar. | Form terbaca, tidak melebar keluar viewport. | 3 kombinasi lolos. |
| Layanan | Tambah `[UJI UTS]`, unggah JPEG, harga 150000/promo 120000, fasilitas; simpan, detail, edit promo 125000, refresh, hapus. | Foto/harga/fasilitas tersimpan, popup dapat dibuka, penghapusan menghilangkan record. | Lolos UI; record dibersihkan. |
| Petugas | Tambah sementara dengan skills; buka detail; ubah skills dan Masa Training, refresh, hapus. | Keahlian/status bertahan. | Lolos UI; record dibersihkan. |
| Customer | Tambah sementara, buka detail; ubah alamat dan Nonaktif, refresh, hapus. | Data sesuai setelah refresh. | Lolos UI; record dibersihkan. |
| FAQ | Tambah pertanyaan/jawaban, pratinjau popup, ubah jawaban, refresh, cari, buka detail dan hapus. | Jawaban terbaru tersimpan; pencarian/popup berfungsi. | Lolos UI; record dibersihkan. |
| Pesanan | Buka Detail dari daftar. Assign/update/read/delete pada fixture sementara. | Detail tetap popup; mutasi lewat HTTP; POST create admin ditolak. | Popup UI dan kontrak HTTP lolos. Tidak mengubah pesanan pengguna. |
| Jadwal | Buka Detail dan lihat tiga shift. Ubah/read/delete pada fixture sementara. | Jam shift konsisten, tidak ada create admin. | Popup UI dan kontrak HTTP lolos. |
| Pantau | Buka tugas `DEMO-ORD-02` dalam modal; cocokkan order/petugas dan status gagal kirim simulasi. | Tugas yang benar; Salin Link/Kirim Ulang tersedia; gagal kirim tidak menghilangkan tugas. | Lolos UI baca. |
| Cleaner HP | Buka link tugas yang sama langsung pada 360 px, lihat bagian atas dan tombol, refresh. | Tanpa dashboard, tanpa overflow; tombol mengikuti form; tugas/tahap tidak kembali awal. | Lolos UI baca. Tidak menekan berangkat pada progres pengguna. |
| Cleaner mutasi | Assign → depart → complete dan retry pada store terisolasi. | Tahap/laporan tersimpan; kegagalan pengiriman terpisah. | Lolos kelompok `check:demo`. Bukti browser alur lengkap sebelumnya di [workflow cleaner](../cleaner-workflow-2026-10-15/README.md) dan [demo terbaru](../admin-demo-2026-10-16/README.md). |
| Laporan | Buka empat tab, unduh CSV dan periksa header/baris. | View berubah dan file berisi data uji. | Lolos UI. |
| Empty | Cari `UTS-TIDAK-ADA-20261016` di FAQ. | “Belum ada data yang sesuai” dan Reset filter tersedia. | Lolos UI. |
| Loading | Navigasi ke laporan. | “Memuat data…” sebelum isi tampil. | Diamati di UI. |
| Error/recovery | Fixture merespons 503, kembali normal. | `ApiError.status=503`; pembacaan pulih. | Lolos HTTP data layer. Runtime UI dengan API tim masih perlu diulang. |
| Session expired | Fixture merespons 401 pada request terlindungi. | Redirect ke `/login?expired=1`. | Lolos HTTP dengan stub redirect. |
| Slow | Fixture menunda respons 1800 ms. | Request dapat ditunggu dan selesai. | Lolos HTTP data layer. |
| Unggah | Multipart JPEG lalu baca bytes URL hasil. | Media ada dan MIME sesuai. | Lolos HTTP dan UI layanan. |
| Promo/banner/kategori | Simpan dan baca kembali melalui fixture. | Kontrak request dan persistensi demo benar. | Lolos HTTP; bukti UI lebih lengkap ada di [audit demo](../admin-demo-2026-10-16/README.md). |
| Build | Format, tsc, demo checks, production build. | Exit code 0. | Lolos; log disimpan. |

## Yang perlu diuji ulang bersama backend

- Jalankan ulang seluruh mutasi dengan `ADMIN_DEMO_ENABLED=false` dan `CLEANER_DEMO_ENABLED=false`; periksa perubahan database melalui backend.
- Pastikan validasi, peran admin, token, field errors, status 401/403/404/422/503 sesuai kontrak.
- Uji dispatch dan laporan pada provider WA sandbox yang disepakati; cek penerima, ID pesan, hasil gagal dan retry. Jangan menguji nomor orang tanpa izin.
- Uji link pada HP fisik; localhost komputer tidak dapat dipakai sebagai alamat HP.
- Uji GPS dengan HTTPS/izin perangkat, serta update order yang sama pada aplikasi mobile.
- Uji status pembayaran/lunas terpisah dari status pekerjaan selesai.

Hasil mentah: [UI](ui-results.json), [responsif](responsive.json), [HTTP](http-results.json), [jurnal HTTP](http-requests.json). Checklist real API sengaja tetap terbuka.
