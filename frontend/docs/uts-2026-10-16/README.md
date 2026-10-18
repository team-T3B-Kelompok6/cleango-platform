# Paket UTS CleanGo — 16 Oktober 2026

> Bukti di folder ini merekam kondisi sebelum revisi antarmuka terbaru. Lihat [revisi terbaru](../ui-revision-2026-10-16/README.md) untuk perubahan popup, harga normal/promo, posisi banner, customer, FAQ, cleaner dan Pantau Petugas. Sebagian screenshot/fitur lama di bawah disimpan sebagai riwayat.

Frontend admin sudah diuji dengan **data demo lokal** dan **fixture HTTP terisolasi**. Backend belum selesai menurut konfirmasi pemilik frontend. Karena itu checklist integrasi API tim/MySQL belum boleh ditandai selesai.

Repositori: [team-T3B-Kelompok6/cleango-platform](https://github.com/team-T3B-Kelompok6/cleango-platform). Branch kerja saat pemeriksaan: `athlonxe`. Backend `origin/main` yang dibaca: `192c4d9` (14 Oktober 2026). Paket ini belum merupakan commit/push baru. Tidak ada perubahan backend atau aplikasi Flutter.

## Dokumen pengumpulan

- [Hasil pengujian dan matriks langkah](TEST-PLAN.md).
- [Perbandingan sembilan halaman dengan Figma](FIGMA-COMPARISON.md).
- [Strategi render Next.js](RENDER-STRATEGY.md).
- [Handoff endpoint dan field untuk backend](BACKEND-HANDOFF.md), bersama [kontrak API lengkap](../API-CONTRACT.md).
- [Panduan uji manual dan akses HP](DEMO.md).

## Status checklist Trello

| Item | Hasil dan bukti | Batas pemeriksaan |
| --- | --- | --- |
| Login sampai logout | Lolos pada demo; akun salah ditolak, logout dan akses halaman terlindungi diuji. [28 kasus UI](ui-results.json). | Autentikasi backend tim belum diuji langsung. |
| Semua navigasi sidebar | Delapan halaman dibuka dari navigasi pada tiga lebar. [Hasil 27 kombinasi termasuk login](responsive.json). | Hasil viewport browser, bukan HP fisik. |
| CRUD layanan | Tambah dengan foto, harga promo, fasilitas; detail popup; ubah, refresh, hapus data sementara berhasil. [Screenshot form](screenshots/layanan-form-1280.jpg). | Penyimpanan demo + HTTP fixture, belum MySQL tim. |
| Pesanan dan jadwal | Popup dibuka, shift disamakan. Assign/read/update/delete diuji melalui HTTP fixture; create admin ditolak. | Backend `main` masih perlu mutasi order dan endpoint jadwal. |
| Cleaner, customer, FAQ | Customer/FAQ/petugas CRUD browser lolos. Cleaner modal + link langsung + refresh pada 360 px lolos; alur mutasi/retry diuji terisolasi. | WA/GPS asli dan sinkronisasi mobile menunggu backend. |
| Laporan | Empat tab dan unduhan CSV diuji; [contoh CSV dari dummy](laporan-demo.csv). | Bukan bukti pembayaran/lunas atau laporan finansial nyata. |
| Risiko | Tidak tersedia sebagai modul proyek saat diperiksa. | Tidak berlaku untuk klausul “jika modul sudah tersedia”. |
| Loading, error, empty state | Loading navigasi dan pencarian kosong diamati di UI. HTTP 503/recovery, 401, empty, slow lolos. | UI error/recovery dengan API tim perlu diuji ulang ketika backend berjalan. |
| Lebar 360 / 768 / 1280 | Sembilan halaman × tiga ukuran; tidak ada overflow horizontal. [Screenshot](screenshots/). | Pemeriksaan geometris dan visual, bukan semua perangkat/browser. |
| Build | [Build produksi](build.txt), [TypeScript](typecheck.txt), [format](format-check.txt) berhasil. | Build tidak membuktikan API tersedia. |
| README, render, screenshot Figma | Tersedia dalam paket ini dan README proyek. | Gap desain tetap ditulis, bukan dianggap implementasi 100%. |

## Hasil terukur

- **28 kasus browser** pada mode demo, seluruhnya lolos.
- **27 kombinasi halaman/lebar** (8 halaman admin + login, masing-masing 3 ukuran).
- **13 kelompok HTTP** menjalankan `lib/api.ts` terhadap loopback fixture. [Hasil](http-results.json), [jurnal request tanpa body/token](http-requests.json), [log](http-check.txt).
- **9 kelompok demo/store** lolos tanpa request eksternal. [Log](demo-check.txt).
- `npm run format:check`, `npm run typecheck`, `npm run build` lolos.

Kasus dari kelompok berbeda dapat mencakup alur yang sama; angka tersebut bukan jumlah fitur unik. Test HTTP memakai stub cookie/navigation/cache Next pada runner, sehingga bukan bukti browser produksi tersambung ke backend tim.

Pengulangan runner HTTP sempat gagal karena fixture lama sudah menghapus order sampelnya. Runner sekarang meminta dataset sementara baru pada setiap eksekusi; dua eksekusi berikutnya sama-sama lolos. Dataset demo pengguna tidak direset. Record browser sementara bernama `[UJI UTS]` sudah dibersihkan.

## Cara mengulang

Di `frontend`, jalankan `npm run dev` dengan `ADMIN_DEMO_ENABLED=true` pada `.env.local`. Login **admin / admin**. Nomor seed dummy tidak aktif; pengiriman selalu simulasi. Jangan mengunggah `.env.local`, `.local`, atau link token tugas ke GitHub.

```sh
npm run format:check
npm run typecheck
npm run check:demo
npm run build
```

Untuk tes HTTP, terminal pertama menjalankan `npm run qa:api`, terminal kedua menjalankan `npm run check:uts:http`. Fixture hanya mendengarkan `127.0.0.1:4410`, menggunakan direktori sementara baru, dan bukan server backend aplikasi. Hentikan dengan Ctrl+C setelah tes; jangan dipakai untuk deployment. Endpoint `__qa` hanya milik fixture skrip tersebut, tidak ditambahkan pada aplikasi Next.

Server frontend produksi uji tambahan sempat ditolak pemeriksaan persetujuan otomatis dengan pesan **“blocked by policy”**. Pemeriksaan dilanjutkan menggunakan server demo yang sudah berjalan dan runner HTTP terpisah; tidak diklaim sebagai tes browser produksi terhubung fixture.

## Perubahan pada tahap UTS ini

1. Definisi shift disatukan dalam `lib/resources.ts` untuk daftar jadwal dan editor booking: 08.00–12.00, 13.00–17.00, 18.00–21.00 WIB.
2. Ditambahkan fixture HTTP dan runner kontrak yang dapat diulang tanpa menyentuh demo pengguna.
3. Bukti browser, screenshot responsif, matriks tes, perbandingan Figma, strategi render, handoff, dan panduan uji manual disusun.
4. README root/frontend dan kontrak jam shift diperbarui.

Revisi sebelumnya—popup detail, promo, gambar layanan, cleaner, tombol berangkat dalam form, dan satu pesan Boo per penugasan—tetap dipertahankan. Daftar temuan Figma merupakan hasil audit, bukan janji bahwa seluruh fitur tambahan sudah selesai.
