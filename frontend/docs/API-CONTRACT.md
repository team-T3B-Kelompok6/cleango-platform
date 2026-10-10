# Kontrak API untuk frontend Cleango

**Status: kontrak yang diharapkan frontend; backend kelompok belum tersedia.** Dokumen ini diberikan ke anggota backend untuk disepakati. Jika kontrak backend berbeda, sesuaikan `lib/api.ts`, `types/`, `lib/resources.ts` dan Server Actions; jangan membuat fallback data dummy dalam komponen.

`API_URL` menunjuk base URL seperti `http://127.0.0.1:3001/api`. Seluruh endpoint mengembalikan JSON. Request data/mutasi memakai `Authorization: Bearer <accessToken>`. Login tidak memerlukan token. Backend memvalidasi token dan peran admin, bukan mempercayai cookie atau field dari frontend.

## Endpoint

| Method | Path setelah base URL                                                 | Respons                                       |
| ------ | --------------------------------------------------------------------- | --------------------------------------------- |
| POST   | `/auth/login`                                                         | `{ "accessToken": "...", "expiresIn": 3600 }` |
| GET    | `/orders`, `/services`, `/staff`, `/customers`, `/faqs`, `/schedules` | `{ "data": [...] }`                           |
| GET    | `/<resource>/:id`                                                     | `{ "data": { ... } }`                         |
| POST   | `/<resource>`                                                         | 201, `{ "data": { ...record, "id": "..." } }` |
| PATCH  | `/<resource>/:id`                                                     | 200, `{ "data": { ...record } }`              |
| DELETE | `/faqs/:id`                                                           | 200 JSON `{ "message": "Data dihapus." }`     |

Daftar saat ini diharapkan lengkap, belum menggunakan pagination API. Filter/search/pagination FAQ dihitung di RSC dari respons daftar. Untuk volume besar, sepakati query pagination server sebelum mengubah kontrak; jangan diam-diam mengembalikan hanya halaman pertama.

PATCH harus mendukung payload parsial. Penugasan memakai `PATCH /orders/:id` dengan `{ "staff": ["Nama Petugas"], "status": "Sedang Dikerjakan" }`. Tidak ada endpoint terpisah `/assignment` dalam implementasi sekarang. Backend memeriksa ketersediaan petugas secara atomik dan memperbarui relasi/status yang relevan. Sebaiknya nama tampilan unik untuk kontrak sementara ini; jika backend memilih ID petugas, ubah kontrak dan form frontend bersama sebelum integrasi.

## Login

```json
{ "username": "admin@cleango.id", "password": "321321", "remember": true }
```

Backend menyediakan akun demo **admin@cleango.id / 321321** dalam seed dan memverifikasi hash password bcrypt. Frontend menyimpan token sebagai cookie `cleango-session` HttpOnly, SameSite=Lax dan Secure pada produksi. `remember` mengatur cookie persisten maksimal 7 hari atau `expiresIn`, mana yang lebih pendek. Jika tidak dicentang, cookie sesi browser. API tetap menentukan kedaluwarsa token. Logout frontend menghapus cookie; jika backend mengharuskan revokasi token, tambahkan endpoint logout dan panggil dari `logoutAction`.

## Bentuk data

Semua `id` berupa string. Harga berupa number rupiah, tanggal `YYYY-MM-DD`, boolean dikirim sebagai boolean, bukan `0`/`1` atau string. `staff` pada orders berupa array string dan `features` services berupa array string (boleh kosong). Tipe lengkap ada di `types/index.ts`.

| Resource  | Field                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------- |
| orders    | `id`, `customer`, `address`, `service`, `price`, `date`, `time`, `staff: string[]`, `status`, `notes` |
| services  | `id`, `name`, `category`, `duration`, `price`, `description`, `active: boolean`, `features: string[]` |
| staff     | `id`, `name`, `area`, `phone`, `status`                                                               |
| customers | `id`, `name`, `phone`, `email`, `address`, `joined`, `active: boolean`                                |
| faqs      | `id`, `category`, `question`, `answer`, `published: boolean`                                          |
| schedules | `id`, `customer`, `service`, `date`, `time`, `staff: string`, `status`                                |

Nilai enum:

- Pesanan: `Menunggu Assign`, `Menunggu Lokasi`, `Sedang Dikerjakan`, `Selesai`.
- Petugas: `Tersedia`, `Bertugas`, `Nonaktif`.
- Jadwal: `Terjadwal`, `Berlangsung`, `Selesai`.
- Kategori layanan: `Rumah`, `Kantor`, `Sofa`, `AC`.
- Kategori FAQ: `Layanan`, `Pembayaran`, `Jadwal`, `SOP`.

`time` saat ini teks tampilan yang diawali jam, misalnya `13.30 WIB` atau `11.00–14.00 WIB`; shift ditentukan dari jam pertama (<12 pagi, <16 siang, sisanya sore). Backend memvalidasi format jam dan tanggal. Daftar orders diharapkan sudah diurutkan terbaru terlebih dahulu untuk aktivitas dashboard/notifikasi. Rekonsiliasi data jadwal/petugas dengan penugasan order menjadi tanggung jawab backend.

## Error dan status

Field tambahan opsional untuk revisi desain:

- `orders.customerId: string` untuk pencocokan pelanggan yang stabil; `paymentMethod: string`, `invoiceId: string` bila tersedia. Ringkasan tetap berdasarkan order selesai, bukan klaim pembayaran lunas.
- `services.packageLabel: string`, `isFavorite: boolean`.
- `staff.rating: number`, `skills: string[]`. Tanpa data rating tidak ada badge angka; keahlian kosong menampilkan keterangan.
- `customers.area: string`, `orderCount: number`, `totalSpent: number`. `totalSpent` adalah nilai order selesai. Jika agregat tidak tersedia, frontend menghitung dari orders: memakai customerId, lalu kecocokan nama persis untuk kontrak lama.
- `faqs.viewCount: number`, `updatedAt: string` tanggal ISO. Statistik pembaca/waktu tidak dipalsukan bila tidak tersedia.
- `schedules.address: string`; jika tidak tersedia, baris menampilkan nama petugas dengan ikon orang.

Field-field ini tidak diwajibkan dalam form CRUD dasar. PATCH parsial harus mempertahankan field lain. Petugas `Tersedia` ditampilkan sebagai “Siaga & Tersedia”, `Bertugas` sebagai “Sedang Bekerja”; nilai API tetap sesuai enum di atas. `Nonaktif` tidak dianggap masa training tanpa status khusus dari backend.

```json
{
  "message": "Periksa isian.",
  "errors": { "email": "Email sudah digunakan.", "price": "Harga tidak valid." }
}
```

`errors` opsional, berupa pasangan nama field ke satu pesan string. Gunakan 400 untuk validasi, 401 untuk sesi/token tidak valid, 403 untuk izin ditolak, 404 untuk record tidak ditemukan, 409 untuk konflik, 500/503 untuk gangguan layanan. Jangan mengembalikan HTML pada error API. Frontend memeriksa `res.ok`; error form ditampilkan per field/pesan umum. HTTP 404 detail memanggil `notFound`, 401 mengalihkan ke login, dan gangguan pemuatan ditangani error boundary.

DELETE perlu mengembalikan JSON 200 sesuai helper saat ini; jika memilih 204, ubah parser helper frontend secara eksplisit.

## Laporan dan notifikasi

Laporan sementara menghitung nilai pesanan berstatus Selesai, bukan bukti pembayaran atau invoice. Rincian pembayaran perlu resource tersendiri bila akan diimplementasikan. Ekspor CSV di Next mengambil data orders dari Express dan melindungi sel dari formula injection.

Notifikasi adalah ringkasan aktivitas pesanan dari respons orders; status dibaca hanya state UI selama layout aktif. Belum ada endpoint notifikasi persisten. Backend final dapat menambah resource notifikasi jika dibutuhkan.

## Checklist integrasi anggota backend

- Siapkan keenam resource dan akun seed demo, termasuk response envelope yang sama.
- Uji login benar/salah, token kedaluwarsa, role ditolak dan record hilang.
- Pastikan create/edit/delete benar-benar tersimpan di MySQL/MariaDB dan terlihat setelah reload.
- Pastikan penugasan tidak menerima petugas tidak tersedia dan tidak menimpa pembaruan bersamaan.
- Berikan `database.sql`, `.env.example`, langkah menjalankan Express serta URL API ke anggota frontend.
- Ulangi smoke test frontend terhadap API nyata, bukan fixture QA.
