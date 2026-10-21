# Pembaruan kategori CleanGo

Frontend sudah diubah langsung pada `C:\Users\athlon\Documents\code\web admin cleango\frontend`.

## Fitur

- Tombol Hapus kategori di Kelola Layanan, dengan pemilihan kategori dan konfirmasi nama.
- Kategori berisi layanan mempunyai checklist **Hapus semua layanan dalam kategori ini**. Centang untuk menghapus kategori bersama seluruh layanan aktif/nonaktifnya. Tanpa checklist, pindahkan layanan ke kategori lain terlebih dahulu.
- Pada kategori kosong, checklist abu-abu dan nonaktif; tombol hapus kategori tetap tersedia. Checklist kembali kosong saat kategori diganti.
- Filter, jumlah kategori, dan pilihan pada form mengikuti perubahan. Filter kategori yang dihapus dibersihkan.
- Tambah/hapus kategori memakai API backend tim `/api/admin/categories`, dengan token admin.
- Mode demo tetap tersedia, dengan penghapusan kategori dan layanan dalam satu perubahan penyimpanan.

## Menggunakan backend teman

Konfigurasi `.env.local` frontend saat diperiksa masih menggunakan demo, dengan `API_URL` menunjuk port 4400. Konfigurasi ini tidak diubah otomatis.

Untuk memakai backend GitHub, jalankan backend tersebut beserta MySQL terlebih dahulu, lalu gunakan:

```dotenv
API_URL=http://127.0.0.1:3001/api
ADMIN_DEMO_ENABLED=false
CLEANER_DEMO_ENABLED=false
```

Restart frontend dan masuk menggunakan akun backend, bukan akun demo.

Folder `backend` pada checkout lokal frontend masih merupakan kerangka lama. Backend Express/TypeScript terbaru berasal dari repo `team-T3B-Kelompok6/cleango-platform`.

Backend GitHub sudah mempunyai endpoint hapus kategori dan foreign key yang menolak penghapusan kategori terpakai. Patch `backend-kategori.patch` menambahkan opsi `DELETE /api/admin/categories/:id?deleteServices=true`: penghapusan layanan dan kategori berjalan dalam satu transaksi dengan penguncian kategori. Jika layanan masih terkait pesanan/ulasan atau salah satu penghapusan gagal, seluruh transaksi dibatalkan sehingga kategori dan layanan tetap ada. Tanpa opsi ini, kategori yang terpakai tetap dilindungi.

Patch juga memperbaiki pembatasan kategori ke empat nama awal agar kategori tambahan dapat digunakan saat membuat/mengubah layanan. Patch ini merupakan pembaruan kumulatif dari patch sebelumnya, untuk basis repo sebelum patch kategori diterapkan.

Terapkan patch dari root checkout backend GitHub yang terbaru:

```sh
git apply --check backend-kategori.patch
git apply backend-kategori.patch
npm test --prefix backend
npm run typecheck --prefix backend
npm run build --prefix backend
```

Tidak diperlukan perubahan skema database. Patch belum di-push ke GitHub.

## Verifikasi

Frontend: pemeriksaan adapter/Server Actions kategori, persetujuan checklist, penghapusan layanan aktif/nonaktif, kegagalan API, 16 kelompok tes demo, TypeScript, dan build produksi. Browser memakai data demo pengujian terpisah, bukan data demo pengguna.

Backend GitHub dengan patch: 36 tes lolos, TypeScript dan build lolos, termasuk penghapusan bersama, perlindungan otorisasi, dan rollback saat layanan/kategori gagal dihapus. Pool MySQL ditirukan pada tes; koneksi ke database/server tim belum diuji langsung.
