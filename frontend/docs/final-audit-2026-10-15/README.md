# Pemeriksaan menyeluruh frontend — 15 Oktober 2026

Pemeriksaan mencakup login, dashboard, keenam menu pengelolaan, laporan, foto layanan, banner, kode promo, kategori, kalender, notifikasi, SOP, navigasi ponsel, dan simulasi tracking. Data uji memakai nama QA Audit dan dihapus setelah pemeriksaan.

## Perbaikan dari pemeriksaan ini

- Coba lagi pada error boundary sekarang memakai `retry()` sesuai Next.js 16.4, sehingga data benar-benar diambil ulang setelah API pulih. `reset()` sebelumnya hanya menghapus state error. Kedua error boundary memakai status pending saat mencoba kembali.
- Pencarian dari halaman detail diarahkan ke daftar resource yang sesuai. Sebelumnya query dikirim kembali ke URL detail dan tidak memfilter daftar.
- Hasil penugasan, status/petugas pesanan, kategori baru, dan URL banner diperiksa terhadap respons API agar perubahan yang diabaikan server tidak ditampilkan sebagai sukses. Respons simpan dengan ID record yang berbeda ditolak.
- Form ubah pesanan memeriksa nama/status petugas terbaru dan menolak status Menunggu Assign bersama pilihan petugas. Petugas lama yang nonaktif tetap dapat dipertahankan pada riwayat.
- Harga transaksi harus berupa rupiah bulat. Parameter halaman FAQ hanya menerima bilangan bulat positif. Ekspor CSV menolak bulan 00/13 dan melindungi formula yang diawali spasi/tab.
- Respons API tidak valid ditangani dengan pesan error; HTTP 401 tetap mengarah ke login. Token login yang bentuknya tidak benar tidak disimpan sebagai cookie.
- Pemulihan fokus setelah modal ditutup memakai `preventScroll` agar fokus tidak menggeser halaman. Status aktif/nonaktif customer kini terlihat pada kartu daftar. Tanggal metadata FAQ memakai WIB dan tidak menampilkan tanggal invalid.
- README utama diperbarui agar port, akun, posisi tombol promo/banner, dan status backend sesuai kondisi branch.

## Hasil pengujian

| Pemeriksaan                                                                                             | Bukti                                                            |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Delapan halaman admin × empat ukuran, 32 kombinasi                                                      | [pages.json](pages.json)                                         |
| Login × empat ukuran, total bersama halaman admin 36 kombinasi                                          | [login.json](login.json)                                         |
| 43 alur UI, termasuk CRUD enam menu, kategori, upload foto/banner, promo, filter, SOP, tracking dan CSV | [ui-checks.json](ui-checks.json)                                 |
| 28 pemeriksaan dialog, termasuk header/footer, scroll lock, dan overflow                                | [dialogs.json](dialogs.json)                                     |
| Notifikasi pada empat ukuran                                                                            | [notifications.json](notifications.json)                         |
| 17 pemeriksaan data kosong, API gagal/pulih, sesi, login, dan 404                                       | [states.json](states.json)                                       |
| 17 kasus batas pada data layer, Server Actions, penugasan, kategori, banner dan CSV                     | [edge-cases.json](edge-cases.json)                               |
| Aturan diskon dan respons simpan promo                                                                  | [Pengujian promo](../promo-management-2026-10-15/rules.json)     |
| Roundtrip enam resource dengan API preview                                                              | [roundtrip.json](../app-compatibility-2026-10-14/roundtrip.json) |
| TypeScript, Prettier dan build produksi                                                                 | [build.txt](build.txt)                                           |
| Pemeriksaan ulang hasil build produksi                                                                  | [production.json](production.json)                               |
| Pembersihan data uji                                                                                    | [cleanup.json](cleanup.json)                                     |

Ukuran pengujian: 1280×900, 768×1024, 360×800, serta 800×360. Tidak ditemukan overflow horizontal halaman, gambar rusak, atau header/footer dialog keluar dari viewport pada pemeriksaan tersebut. Semua alur normal diuji tanpa error konsol sebelum simulasi kegagalan API. Error API 503 sengaja dipicu saat memeriksa error boundary; error pengujian ini tercatat oleh mode development.

Browser pengujian memakai reduced motion. Style animasi dan kondisi reduced motion diperiksa pada CSS; gerak normal belum diperiksa secara visual. Pemilihan/reset tanggal juga diuji dengan klik langsung pada footer kalender, karena auto-scroll locator pengujian dapat menggeser halaman dan menutup popup yang mengikuti tombol pemicunya.

## Tampilan

- [Login](login-desktop.png)
- [Dashboard](dashboard-desktop.png)
- [Pesanan](pesanan-desktop.png)
- [Jadwal](jadwal-desktop.png)
- [Layanan](layanan-desktop.png)
- [FAQ](faq-desktop.png)
- [Customer](customer-desktop.png)
- [Petugas](petugas-desktop.png)
- [Laporan](laporan-desktop.png)
- [Kondisi API gagal](API-unavailable.png)
- [Laporan kosong di ponsel](empty-report.png)
- [Contoh CSV yang diunduh](laporan-test.csv)

## Batas pengujian dan integrasi

Alur frontend diuji menggunakan API preview terpisah. Ini belum membuktikan penyimpanan MySQL/MariaDB atau sinkronisasi aplikasi mobile. Tidak ada perubahan pada implementasi backend maupun mobile.

`origin/main` diperiksa ulang dan masih pada commit `192c4d9`. Backend tim di main lebih lengkap daripada setup backend yang masih ada pada branch frontend `athlonxe`. Endpoint jadwal/customer, mutasi pesanan, upload/banner, kode promo, kategori/keahlian, dan field foto/harga promo perlu diselaraskan sesuai [kontrak API](../API-CONTRACT.md). Akun seed tim adalah admin@cleango.id / 321321; admin/admin digunakan oleh API preview.

Salinan mobile masih memakai CLEANHEMAT dan diskon 35% secara statis di checkout. Kode promo baru dari admin belum otomatis dipakai aplikasi tersebut. Tracking tetap simulasi, tanpa GPS. Kesamaan visual mengacu pada prototype/screenshot yang telah tersedia; pemeriksaan ini tidak mengklaim kesamaan setiap pixel dengan revisi Figma terbaru.
