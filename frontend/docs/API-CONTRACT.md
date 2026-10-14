# Kontrak API untuk frontend Cleango

**Status: diterapkan pada backend CleanGo untuk login serta CRUD layanan, FAQ, dan petugas.** Resource lain tetap harus mengikuti kontrak ini saat diimplementasikan; jangan membuat fallback data dummy dalam komponen.

`API_URL` menunjuk base URL `http://127.0.0.1:3001/api`. Seluruh endpoint mengembalikan JSON. Request data/mutasi memakai `Authorization: Bearer <accessToken>`. Login tidak memerlukan token. Backend memvalidasi token dan peran admin, bukan mempercayai cookie atau field dari frontend.

## Endpoint

| Method | Path setelah base URL                                                 | Respons                                       |
| ------ | --------------------------------------------------------------------- | --------------------------------------------- |
| POST   | `/auth/login`                                                         | `{ "accessToken": "...", "expiresIn": 3600 }` |
| GET    | `/orders`, `/services`, `/staff`, `/customers`, `/faqs`, `/schedules` | `{ "data": [...] }`                           |
| GET    | `/<resource>/:id`                                                     | `{ "data": { ... } }`                         |
| POST   | `/services`, `/staff`, `/customers`, `/faqs`                          | 201, `{ "data": { ...record, "id": "..." } }` |
| PATCH  | `/<resource>/:id`                                                     | 200, `{ "data": { ...record } }`              |
| DELETE | `/<resource>/:id`                                                     | 200 JSON `{ "message": "Data dihapus." }`     |

Daftar saat ini diharapkan lengkap, belum menggunakan pagination API. Filter/search/pagination FAQ dihitung di RSC dari respons daftar. Untuk volume besar, sepakati query pagination server sebelum mengubah kontrak; jangan diam-diam mengembalikan hanya halaman pertama.

## Aksi web admin

| Menu     | Aksi                                         |
| -------- | -------------------------------------------- |
| Pesanan  | Assign petugas, read, update, delete         |
| Jadwal   | Read, update, delete                         |
| Layanan  | Create, read, update, delete                 |
| FAQ      | Create, read, update, delete                 |
| Customer | Read, update, delete; create manual tersedia |
| Petugas  | Create, read, update, delete                 |

Pesanan dan jadwal dibuat melalui aplikasi pelanggan, sehingga web admin tidak menyediakan form atau Server Action untuk membuat keduanya. Jalur `/pesanan/new` dan `/jadwal/new` tidak tersedia. Backend tetap harus memeriksa kewenangan create di endpointnya sendiri.

DELETE selalu melalui dialog konfirmasi nama dan ID. Backend menentukan kebijakan data yang masih memiliki relasi atau transaksi. Jika penghapusan ditolak, kembalikan status 409 dengan `message` yang menjelaskan alasannya; frontend mempertahankan dialog dan menampilkan pesan tersebut. Penghapusan customer tidak diasumsikan menghapus akun atau seluruh pesanan, dan penghapusan petugas tidak diasumsikan menghapus riwayat penugasan.

PATCH harus mendukung payload parsial. Penugasan memakai `PATCH /orders/:id` dengan `{ "staff": ["Nama Petugas"], "status": "Sedang Dikerjakan" }`. Tidak ada endpoint terpisah `/assignment` dalam implementasi sekarang. Backend memeriksa ketersediaan petugas secara atomik dan memperbarui relasi/status yang relevan. Sebaiknya nama tampilan unik untuk kontrak sementara ini; jika backend memilih ID petugas, ubah kontrak dan form frontend bersama sebelum integrasi.

## Login

```json
{ "username": "admin@cleango.id", "password": "321321", "remember": true }
```

Backend menyediakan akun demo **admin@cleango.id/321321** dalam seed dan memverifikasi password. Frontend menyimpan token sebagai cookie `cleango-session` HttpOnly, SameSite=Lax dan Secure pada produksi. `remember` mengatur cookie persisten maksimal 7 hari atau `expiresIn`, mana yang lebih pendek. Jika tidak dicentang, cookie sesi browser. API tetap menentukan kedaluwarsa token. Logout frontend menghapus cookie; jika backend mengharuskan revokasi token, tambahkan endpoint logout dan panggil dari `logoutAction`.

## Bentuk data

Semua `id` berupa string. Harga berupa number rupiah, tanggal `YYYY-MM-DD`, boolean dikirim sebagai boolean, bukan `0`/`1` atau string. `staff` pada orders berupa array string dan `features` services berupa array string (boleh kosong). Tipe lengkap ada di `types/index.ts`.

| Resource  | Field                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------- |
| orders    | `id`, `customer`, `address`, `service`, `price`, `date`, `time`, `staff: string[]`, `status`, `notes` |
| services  | `id`, `name`, `category`, `duration`, `price`, `description`, `active: boolean`, `features: string[]` |
| staff     | `id`, `name`, `skills: string[]`, `phone`, `status`                                                   |
| customers | `id`, `name`, `phone`, `email`, `address`, `joined`, `active: boolean`                                |
| faqs      | `id`, `category`, `question`, `answer`, `published: boolean`                                          |
| schedules | `id`, `customer`, `service`, `date`, `time`, `staff: string`, `status`                                |

Nilai enum:

- Pesanan: `Menunggu Assign`, `Menunggu Lokasi`, `Sedang Dikerjakan`, `Selesai`, `Batal`.
- Petugas: `Tersedia`, `Bertugas`, `Masa Training`, `Nonaktif`.
- Jadwal: `Terjadwal`, `Berlangsung`, `Selesai`.
- Kategori layanan dan FAQ mengikuti daftar `/categories`; nama kategori bukan enum tetap.

`time` saat ini teks tampilan yang diawali jam, misalnya `13.30 WIB` atau `11.00–14.00 WIB`; shift ditentukan dari jam pertama (<12 pagi, <16 siang, sisanya sore). Backend memvalidasi format jam dan tanggal. Daftar orders diharapkan sudah diurutkan terbaru terlebih dahulu untuk aktivitas dashboard/notifikasi. Rekonsiliasi data jadwal/petugas dengan penugasan order menjadi tanggung jawab backend.

## Error dan status

Field tambahan opsional untuk revisi desain:

- `orders.customerId: string` untuk pencocokan pelanggan yang stabil; `paymentMethod: string`, `invoiceId: string` bila tersedia. Ringkasan tetap berdasarkan order selesai, bukan klaim pembayaran lunas.
- `services.packageLabel: string`, `isFavorite: boolean`.
- `staff.rating: number`. Tanpa data rating tidak ada badge angka; keahlian (`skills`) diisi lewat form, satu per baris. `area` lama boleh dipertahankan di API, tetapi tidak lagi diedit oleh form petugas.
- `customers.area: string`, `orderCount: number`, `totalSpent: number`. `totalSpent` adalah nilai order selesai. Jika agregat tidak tersedia, frontend menghitung dari orders: memakai customerId, lalu kecocokan nama persis untuk kontrak lama.
- `faqs.viewCount: number`, `updatedAt: string` tanggal ISO. Statistik pembaca/waktu tidak dipalsukan bila tidak tersedia.
- `schedules.address: string`; jika tidak tersedia, baris menampilkan nama petugas dengan ikon orang.

Field-field ini tidak diwajibkan dalam form CRUD dasar. PATCH parsial harus mempertahankan field lain. Petugas `Tersedia` ditampilkan sebagai “Siaga & Tersedia”, `Bertugas` sebagai “Sedang Bekerja”; nilai API tetap sesuai enum di atas. `Masa Training` merupakan status tersendiri, bukan pengganti `Nonaktif`. Form penugasan hanya memilih petugas tersedia; form detail pesanan menawarkan petugas tersedia atau sedang bertugas. Petugas training/nonaktif tidak ditawarkan untuk penugasan baru, tetapi nama yang sudah tercatat pada pesanan tetap ditampilkan agar riwayat tidak hilang saat detail lain diubah. Tab Nonaktif muncul ketika ada data nonaktif atau filter Nonaktif sedang dibuka.

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

## Kategori dan promo beranda (revisi 13 Oktober 2026)

Kategori layanan dan FAQ dikelola terpisah. Endpoint baru:

| Method | Path                                                 | Request / respons                                                                                                                                  |
| ------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/categories?resource=services` atau `resource=faqs` | `{ "data": [{ "id": "CAT-01", "resource": "services", "name": "Rumah" }] }`                                                                        |
| POST   | `/categories`                                        | JSON `{ "resource": "services", "name": "Perawatan taman" }`; 201 `{ "data": { "id": "...", "resource": "services", "name": "Perawatan taman" } }` |
| POST   | `/uploads`                                           | Multipart `file` + `purpose=promotion`; 201 `{ "data": { "url": "https://.../banner.webp" } }`                                                     |

Banner merupakan resource tersendiri. Tombol Tambah Banner Promo berada di sebelah Tambah Layanan Baru. Form hanya mengunggah gambar; tidak meminta judul, status tayang, voucher, atau tautan layanan.

| Method | Path           | Respons                                   |
| ------ | -------------- | ----------------------------------------- |
| GET    | `/banners`     | `{ "data": [Banner] }`                    |
| GET    | `/banners/:id` | `{ "data": Banner }`                      |
| POST   | `/banners`     | 201 `{ "data": Banner }`                  |
| PATCH  | `/banners/:id` | 200 `{ "data": Banner }`                  |
| DELETE | `/banners/:id` | 200 JSON `{ "message": "Data dihapus." }` |

```json
{
  "id": "BANNER-01",
  "imageUrl": "https://cdn.example.com/banner.webp"
}
```

POST/PATCH hanya mengirim `{ "imageUrl": "..." }`; ID dibuat backend. Gambar diunggah lewat `/uploads` terlebih dahulu. Ringkasan `/layanan?view=promos` membaca `/banners` dan menyediakan lihat, ganti gambar, serta hapus dengan konfirmasi. Edit tanpa gambar baru mempertahankan URL lama. Record layanan tidak memiliki field banner. Mobile menampilkan gambar secara pasif tanpa aksi navigasi; tulisan promo dibuat langsung di dalam gambar.

Upload menerima JPG, PNG, atau WebP, maksimal 2 MB. Ukuran yang disarankan 1200 × 400 px; frontend menampilkan gambar utuh tanpa memotongnya. Backend memeriksa isi/MIME/ukuran berkas, menyimpan foto, dan mengembalikan URL HTTP(S) yang bisa dibaca aplikasi mobile. URL relatif juga diterima frontend, tetapi harus tersedia pada origin web admin; URL absolut lebih mudah dipakai bersama mobile. Upload tidak memakai header JSON, agar boundary multipart diatur otomatis.

Backend membuat nama kategori unik per `resource` setelah trim/normalisasi spasi dan tanpa membedakan huruf besar-kecil, serta memvalidasi kategori layanan/FAQ yang dikirim. Kategori awal yang sudah digunakan harus disediakan dalam seed. Frontend mempertahankan kategori record lama saat edit.

Penyimpanan kategori, promo, dan foto tetap perlu implementasi backend tim. Aplikasi mobile perlu menampilkan gambar banner yang disediakan backend; halaman mobile tidak termasuk pekerjaan web admin ini. Backend menyimpan gambar dan membersihkan upload yang tidak terpakai.
