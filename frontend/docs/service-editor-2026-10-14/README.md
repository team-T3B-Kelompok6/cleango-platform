# Revisi pengelolaan layanan — 14 Oktober 2026

Form layanan mengikuti susunan screenshot Figma yang diberikan: kolom foto, detail dan harga di kiri; deskripsi, fasilitas dan status di kanan. Pada layar kecil, kedua kolom ditumpuk. Isi form dapat digulir, sedangkan header dan tombol footer tetap terlihat.

## Perubahan

- Foto utama layanan: unggah, ganti, hapus, dan pratinjau JPG/PNG maksimal 5 MB.
- Harga dasar dan harga promo opsional; pratinjau harga akhir serta nilai/persentase potongan dihitung langsung.
- Fasilitas bisa ditambah, diubah, dan dihapus; maksimal 15 fasilitas.
- Status layanan memakai switch aktif/nonaktif.
- Daftar dan detail layanan menampilkan foto serta harga promo jika tersedia.
- Halaman/tab Promo Beranda dihapus. Tombol Tambah Banner Promo dipertahankan di sebelah Tambah Layanan Baru, dengan form unggah gambar tersendiri. Tautan lama dengan `view=promos` membuka daftar layanan.
- Latar FAQ mengikuti latar halaman pengelolaan lainnya.
- Input form layanan menggunakan gaya input bersama; font, warna tombol, dan footer mengikuti halaman lain.

## Pemeriksaan

Sembilan halaman diperiksa pada 1280 × 900 dan 360 × 800: dashboard, pesanan, jadwal, layanan, FAQ, customer, petugas, laporan, dan login. Tidak ditemukan gulir horizontal. Header halaman admin tetap sticky, font judul konsisten, dan menu Promo Beranda tidak muncul.

Form tambah/edit layanan diperiksa pada 1280 × 900, 768 × 1024, 360 × 800, dan 800 × 360. Isi tidak melebar keluar dialog dan footer tetap berada dalam viewport setelah perpindahan fokus menggulir isi. Footer mobile akhir memiliki tombol setinggi 40 px dan tetap satu baris.

Interaksi melalui API preview lokal berhasil untuk tambah layanan, unggah dan ganti foto, hapus foto, simpan/hapus harga promo, tambah/hapus fasilitas, serta nonaktifkan layanan. Data uji telah dibersihkan. Berkas non-gambar ditolak. Saat harga promo tidak valid, pesan muncul dan isian form tetap terjaga.

Validasi Server Action diperiksa terhadap foto lebih dari 5 MB, MIME yang tidak didukung, harga dasar nol, harga promo melebihi harga dasar atau pecahan, dan lebih dari 15 fasilitas. Permintaan yang tidak valid dihentikan sebelum upload/penyimpanan. Penghapusan foto mengirim `imageUrl: null`; edit tanpa perubahan foto tidak menimpa URL sebelumnya.

Build produksi, TypeScript, dan pemeriksaan format lolos. Penyimpanan database dan endpoint upload pada backend asli perlu mengikuti [kontrak API](../API-CONTRACT.md).

## Bukti

- [Dialog desktop](edit-1280.png)
- [Dialog layar kecil](edit-360.png)
- [Pratinjau harga promo](harga-promo-1280.png)
- [Daftar layanan](layanan-1280.png)
- [FAQ dengan latar bersama](faq-1280.png)
- [Pemeriksaan halaman](pages.json)
- [Pemeriksaan dialog](dialogs.json)
- [Footer mobile akhir](footer-mobile-final.json)

Screenshot lama pada folder pemeriksaan sebelumnya tetap menjadi arsip. Screenshot di folder ini menunjukkan revisi terbaru.
