# Audit Log Admin — integrasi frontend

Frontend sudah ditambahkan langsung di `C:\Users\athlon\Documents\code\web admin cleango\frontend`. Buka `/audit-log` dari sidebar **Audit Log Admin**.

## Status

Tampilan riwayat, pencarian, filter admin/tanggal/jenis aktivitas, pagination, serta dialog perbandingan nilai sudah dibuat. Mode demo mempunyai data contoh yang ditandai dan mencatat aktivitas demo baru setelah fitur ini dipasang. Riwayat lama sebelum pemasangan tidak direkonstruksi.

Backend GitHub yang diperiksa mempunyai tabel `admin_audit_logs`, tetapi belum mempunyai endpoint audit maupun penulisan audit pada controller. Karena itu, integrasi audit produksi masih menunggu backend sebagaimana tugas Trello. Frontend tidak mengirim log audit buatan browser ke server dan tidak menganggap data demo sebagai audit produksi.

## Draf kontrak yang diharapkan frontend

```http
GET /api/audit-logs?q=&adminId=&action=&from=2026-10-20&to=2026-10-21&page=1
Authorization: Bearer <token admin>
```

Semua filter opsional. `page` dimulai dari 1; ukuran halaman ditentukan backend (1–100, contoh 8). `action` adalah `create`, `update`, `delete`, `assign`, atau `login`. Pencarian meliputi ringkasan, ID objek, admin, dan jenis data.

Tanggal `from` dan `to` memakai hari kalender Asia/Jakarta, inklusif sampai akhir hari. Contoh tanggal 20 Oktober mencakup mulai `2026-10-19T17:00:00Z` hingga sebelum `2026-10-20T17:00:00Z`. Backend wajib menerapkan filter sebelum menghitung total dan pagination, lalu mengurutkan terbaru dahulu dengan ID sebagai urutan tambahan.

```json
{
  "data": [
    {
      "id": "125",
      "admin": { "id": "1", "name": "Admin Operasional" },
      "action": "update",
      "entityType": "services",
      "entityId": "3",
      "summary": "Mengubah harga Deep Cleaning Rumah",
      "createdAt": "2026-10-21T02:30:00.000Z",
      "before": { "price": 300000, "active": true },
      "after": { "price": 350000, "active": true }
    }
  ],
  "admins": [
    { "id": "1", "name": "Admin Operasional" }
  ],
  "meta": { "total": 1, "page": 1, "pageSize": 8 }
}
```

`admins` adalah seluruh pilihan admin yang boleh dilihat pengguna, bukan hanya admin pada halaman aktif, agar filter tidak hilang saat pagination. ID dikirim sebagai string. `createdAt` wajib berupa waktu ISO dengan zona (`Z` atau offset).

Snapshot `before` dan `after` berupa objek atau null. Penambahan memakai `before: null`, penghapusan memakai `after: null`. Jika backend belum menyediakan rincian, kedua properti boleh dihilangkan; dialog akan menyatakan rincian belum tersedia. Frontend hanya menampilkan kolom yang nilainya berubah. Kolom kata sandi, token, secret, cookie, dan kunci API disaring secara rekursif sebelum ditampilkan; backend tetap wajib menyaringnya sebelum penyimpanan/pengiriman.

Pemetaan dari tabel backend: `admin_id` dan nama admin dari relasi users menjadi `admin`, `entity_type` menjadi `entityType`, `entity_id` menjadi `entityId`, `old_values`/`new_values` menjadi `before`/`after`, dan `created_at` menjadi ISO `createdAt`. Pemetaan ini masih perlu disepakati dengan tim backend.

Audit produksi perlu dibuat oleh backend bersama mutasi data yang berhasil, memakai identitas admin dari token terverifikasi. Perubahan gagal tidak boleh membuat catatan sukses. Hindari endpoint publik untuk menulis/menghapus audit. Halaman frontend hanya menyediakan pembacaan.

## Respons yang ditangani

- 401: kembali ke login.
- 404/501: riwayat belum tersedia, tanpa fallback ke demo.
- 403/5xx atau respons tidak sesuai kontrak: tampilkan kegagalan pemuatan dan opsi mencoba kembali.
- Daftar kosong/filter tanpa hasil: tampilkan keadaan kosong serta reset filter.
- Tanggal tidak valid/rentang terbalik: tampilkan validasi tanpa mengirim permintaan audit.

## Verifikasi

```sh
npm run check:audit
npm run check:demo
npm run check:categories
npm run typecheck
npm run build
```

Tes memakai data sementara dan respons API tiruan. Mode demo menggunakan penyimpanan lokal, bukan mekanisme audit produksi atau bukti kepatuhan audit. Backend/MySQL tim belum diuji karena endpointnya belum tersedia.

Hasil pemeriksaan: 9 kelompok tes audit, 16 kelompok tes demo, pemeriksaan kategori, TypeScript, build produksi, dan format lolos. Browser diperiksa pada desktop 1280 piksel dan ponsel 360 piksel: filter gabungan admin/tanggal/jenis, detail sebelum-sesudah, filter tetap ada setelah menutup dialog, pencarian tanpa hasil, reset, halaman berikutnya, serta penambahan kategori yang langsung muncul di log sebagai aktivitas demo.
