# Aksi pengelolaan web admin

Pemeriksaan 10 Oktober 2026 mengikuti pembagian fitur web admin dan aplikasi pelanggan.

| Menu     | Aksi admin                                 | Screenshot desktop            |
| -------- | ------------------------------------------ | ----------------------------- |
| Pesanan  | Assign petugas, lihat, ubah, hapus         | [Pesanan](pesanan-1280.jpg)   |
| Jadwal   | Lihat, ubah, hapus                         | [Jadwal](jadwal-1280.jpg)     |
| Layanan  | Tambah, lihat, ubah, hapus                 | [Layanan](layanan-1280.jpg)   |
| FAQ      | Tambah, lihat, ubah, hapus                 | [FAQ](faq-1280.jpg)           |
| Customer | Lihat, ubah, hapus; tambah manual tersedia | [Customer](customer-1280.jpg) |
| Petugas  | Tambah, lihat, ubah, hapus                 | [Petugas](petugas-1280.jpg)   |

Pesanan dan jadwal dibuat melalui aplikasi pelanggan. Tombol tambah pada header, slot shift, serta dashboard kosong sudah dihapus. Route `/pesanan/new` dan `/jadwal/new` tidak tersedia. Server Action juga menolak create untuk kedua resource tersebut.

Tombol hapus tersedia di daftar dan halaman detail. Dialog menunjukkan nama dan ID data, menyediakan Batal, serta menampilkan error ketika API menolak penghapusan. Setelah berhasil, halaman kembali ke daftar dan ringkasan terkait diperbarui. Customer dapat diubah melalui halaman detail. Pesanan dengan status Menunggu Assign atau Menunggu Lokasi dapat ditugaskan dari daftar maupun halaman detail.

## Hasil pemeriksaan

Build produksi, TypeScript, dan format kode lolos. [23 pemeriksaan interaksi dan 24 pemeriksaan layout](qa.json) lolos. Keenam menu diperiksa pada 1280×820, 768×1024, 360×800, serta landscape 800×360 tanpa overflow horizontal. Screenshot ponsel tersimpan dengan akhiran `-360.jpg`.

CRUD, penugasan, pembatalan dialog hapus, route tambah yang dihapus, serta kondisi gagal penghapusan diuji menggunakan API preview di luar repositori. Record uji yang dibuat telah dihapus; data contoh awal dipertahankan. Pengujian ini memverifikasi alur frontend, belum membuktikan integrasi Express, database, ataupun aplikasi mobile tim.

[Kontrak API](../API-CONTRACT.md) mencantumkan endpoint dan kebijakan respons yang diharapkan. Backend tetap bertanggung jawab atas validasi izin, relasi, penugasan atomik, dan penyimpanan data.

## Popup tambah layanan

Style form pada area tombol header sebelumnya ikut diterapkan ke dialog, sehingga footer membungkus ke samping dan tombol simpan terpotong. Selector toolbar kini dibatasi ke form langsung, sedangkan form dialog memakai kolom tanpa wrapping. Popup tambah dan ubah layanan memakai lebar 760px dengan batas viewport; header dan footer tetap terlihat saat isi form digulir.

Contoh isian dan petunjuk fasilitas ditambahkan tanpa mengubah field API. [Pemeriksaan popup](service-popup-qa.json) mencakup desktop, tablet, ponsel, landscape, serta regresi popup FAQ, customer, petugas, detail pesanan, dan assign. Tambah layanan melalui popup pada ponsel berhasil disimpan ke API preview; record uji sudah dibersihkan. Build produksi dan TypeScript lolos. [Tampilan popup](tambah-layanan.jpg).
