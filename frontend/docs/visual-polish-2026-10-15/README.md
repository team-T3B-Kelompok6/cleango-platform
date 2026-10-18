# Perapian tampilan web admin — 15 Oktober 2026

Login, dashboard, pesanan, jadwal, layanan, FAQ, customer, petugas, dan laporan diperiksa dengan aturan tampilan yang sama. Susunan halaman serta alur pengelolaan yang sudah ada dipertahankan.

## Perubahan

- Teks utama 15px, judul halaman desktop 28px, judul kartu 16px, dan informasi pendukung 13px. Form memakai teks 16px. Font DM Sans dan Plus Jakarta Sans tetap dipakai dengan jarak baris yang lebih longgar.
- Tombol aksi pada kartu memakai teks 14px dengan tinggi 40px. Kontrol pada judul halaman memakai tinggi 44px, termasuk filter tanggal. Tombol utama tetap hijau; tombol pendamping memakai permukaan putih dan border yang sama.
- Kartu memakai border dan sudut yang seragam. Garis warna dekoratif pada kartu ringkasan dihapus. Kategori FAQ memakai warna netral; warna status tetap membedakan menunggu, berjalan, dan selesai.
- Teks jam pesanan, jawaban FAQ, label grafik, harga, dan kategori layanan mempunyai kontras yang lebih jelas.
- Login memakai latar tenang yang sama dengan halaman admin. Label form memakai penulisan biasa.
- Ringkasan di tablet dan ponsel menggunakan dua kolom. Kartu ketiga melebar agar nominal dan keterangannya tetap terbaca.
- Hover tombol dan kartu memakai perubahan warna/border yang ringan. Kartu tidak terangkat dan tab tidak memantul. Transisi memakai durasi bersama 140–220ms.
- Dialog memakai alur penutupan yang sama untuk tombol Batal, silang, Escape, dan footer SOP. Fokus kembali ke pemicu dan scroll halaman dipulihkan setelah dialog ditutup.
- Filter tanggal dan notifikasi memakai transisi turun pendek. Menu akun dan menu pesanan juga mempunyai transisi buka/tutup.

Nilai bersama berada di `app/tokens.css`; aturan pengelolaan bersama berada di `app/management.css`. Tidak ada perubahan kontrak API, backend, atau source mobile dalam revisi tampilan ini.

## Pemeriksaan

| Pemeriksaan                                                                             | Hasil                                                                |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Sembilan halaman × desktop 1280×900, tablet 768×1024, ponsel 360×800, landscape 800×360 | 36 pemeriksaan lolos, tanpa overflow horizontal                      |
| Lebar dan posisi konten saat berpindah tab pesanan                                      | Tetap sama                                                           |
| Header setelah halaman pesanan digulir                                                  | Tetap di atas                                                        |
| Empat tab SOP                                                                           | Ukuran tetap 960×660 pada desktop; Ringkasan tidak menggulir         |
| Form layanan pada empat viewport                                                        | Tetap di dalam viewport; body dapat digulir dan footer terlihat      |
| Filter tanggal dan notifikasi                                                           | Panel tetap di dalam viewport                                        |
| Tracking pada desktop, ponsel, dan landscape                                            | Footer terlihat dan dialog tidak melebar keluar viewport             |
| Batal, silang, Escape, serta footer SOP                                                 | Menutup dialog, memulihkan fokus, dan membuka kembali scroll halaman |
| Build produksi                                                                          | Lolos                                                                |
| Pemeriksaan tampilan produksi dashboard, pesanan, layanan, FAQ                          | Sesuai preview; form FAQ dapat dibuka dan dibatalkan                 |
| TypeScript, format, dan `git diff --check`                                              | Lolos                                                                |
| Error konsol selama pengujian browser                                                   | Tidak ada                                                            |

Browser pengujian mengaktifkan `prefers-reduced-motion: reduce`. Dalam mode tersebut, animasi/transisi sengaja dinonaktifkan dan dialog langsung ditutup. Durasi gerakan pada mode normal ditentukan dalam CSS; gerakan mode normal belum dinilai secara visual melalui browser pengujian ini. Perbaikan ini tidak mengubah pengaturan gerakan perangkat.

Hasil terstruktur: [responsif](responsive.json), [dialog](dialogs.json), [produksi](production.json), [build](build.txt).

## Tampilan akhir

| Halaman   | Desktop                             | Ponsel                          |
| --------- | ----------------------------------- | ------------------------------- |
| Login     | [Screenshot](login-desktop.png)     | [Screenshot](login-360.png)     |
| Dashboard | [Screenshot](dashboard-desktop.png) | [Screenshot](dashboard-360.png) |
| Pesanan   | [Screenshot](pesanan-desktop.png)   | [Screenshot](pesanan-360.png)   |
| Jadwal    | [Screenshot](jadwal-desktop.png)    | [Screenshot](jadwal-360.png)    |
| Layanan   | [Screenshot](layanan-desktop.png)   | [Screenshot](layanan-360.png)   |
| FAQ       | [Screenshot](faq-desktop.png)       | [Screenshot](faq-360.png)       |
| Customer  | [Screenshot](customer-desktop.png)  | [Screenshot](customer-360.png)  |
| Petugas   | [Screenshot](petugas-desktop.png)   | [Screenshot](petugas-360.png)   |
| Laporan   | [Screenshot](laporan-desktop.png)   | [Screenshot](laporan-360.png)   |

Dialog: [form layanan desktop](form-layanan-1280.png), [form layanan ponsel](form-layanan-360.png), [SOP](sop-desktop.png), [notifikasi](notifikasi-desktop.png), [filter tanggal](filter-tanggal-desktop.png).
