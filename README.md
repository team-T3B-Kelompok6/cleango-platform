# Cleango Admin

Dashboard admin Cleango dengan React, TypeScript (TSX), Vite, TanStack Router, dan TanStack Table v8. Styling memakai CSS biasa dengan DM Sans dan Plus Jakarta Sans yang disimpan lokal melalui Fontsource. Ikon dashboard tersedia di `public/assets`.

## Menjalankan

Gunakan Node.js 22.12+ atau 24+.

```sh
npm install
npm run dev
```

Buka alamat lokal yang ditampilkan. Build produksi: `npm run build`. Pemeriksaan TypeScript: `npm run typecheck`. Rapikan kode: `npm run format`.

## Halaman dan interaksi

- `/login`: masuk memakai akun demo **admin / admin**. Tidak ada opsi lupa kata sandi. Sesi disimpan di `sessionStorage`; opsi Ingat saya memakai `localStorage` hingga logout.
- `/`: Dashboard Utama, kartu statistik, aktivitas terbaru, pencarian, dialog SOP, notifikasi, dan profil demo.
- `/pesanan`: daftar kartu pesanan, pencarian TanStack Table, filter status dan rentang tanggal, penugasan petugas, serta detail/edit pesanan.
- `/pesanan?order=CL-8923`: membuka detail pesanan langsung. Link aktivitas dashboard memakai pola ini.
- `/jadwal`: agenda operasional, filter tanggal/shift, tambah dan ubah jadwal.
- `/layanan`: katalog layanan, filter kategori, tambah/ubah, dan aktif/nonaktif layanan.
- `/faq`: pertanyaan umum per kategori, tambah/ubah, dan status tayang/draf.
- `/petugas`: direktori dan status petugas, tambah/ubah petugas. Petugas aktif muncul di pilihan penugasan pesanan.
- `/customer`: profil customer, tambah/ubah, dan jumlah pesanan pada data demo.
- `/laporan`: ringkasan, tren ilustratif, filter bulan, invoice, rincian, dan ekspor CSV.
- Perubahan data disimpan di state React bersama. Reload halaman mengembalikan data awal. Login ini khusus demo di sisi klien dan **bukan** autentikasi produksi; tidak ada backend atau penyimpanan permanen.
- Data dummy menggunakan 18 September 2026. Angka ringkasan menggunakan baseline dari desain, sedangkan empat kartu merupakan contoh pesanan. Jumlah ringkasan menyesuaikan perubahan status pada data contoh.

## Struktur

`src/components` berisi layout, ikon, kartu statistik, status badge, dan dialog bersama. `src/pages` berisi seluruh halaman admin. `src/data` berisi tipe, data dummy, autentikasi demo, dan context state. Routing terdapat di `src/main.tsx`; token dan responsive layout di `src/styles.css` serta `src/admin.css`.

## Referensi desain

[Figma Cleango](https://www.figma.com/design/ymMzgCxXWLUncDBzi1e4Oq/Cleango?node-id=139-2).

Dashboard Utama memakai design context dan screenshot frame 327:2. Revisi 30 September 2026 dicocokkan melalui tampilan Figma di browser: login 328:2, pesanan 329:2, jadwal 330:2, layanan 331:2, petugas 332:2, customer 333:2, laporan 334:2, dan FAQ 548:58. Pembacaan properti serta ekspor ikon tambahan melalui MCP masih terkena batas Starter; ikon tambahan menggunakan SVG lokal. Label hari/tanggal demo dibuat konsisten. Sidebar mengisi tinggi layar dan layout menyesuaikan desktop/mobile.

Pola routing mengikuti [TanStack Router Quickstart](https://tanstack.com/router/latest/docs/framework/react/examples/quickstart); filtering kartu menggunakan [TanStack Table v8](https://tanstack.com/table/v8/docs/framework/react).
