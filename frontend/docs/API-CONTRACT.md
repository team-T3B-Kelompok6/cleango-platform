# Kontrak API untuk frontend Cleango

**Status: kontrak yang digunakan frontend. Endpoint dan field tambahan perlu diselaraskan dengan backend tim.** Dokumen ini diberikan ke anggota backend untuk disepakati. Jika kontrak backend berbeda, sesuaikan `lib/api.ts`, `types/`, `lib/resources.ts` dan Server Actions; jangan membuat fallback data dummy dalam komponen.

`API_URL` menunjuk base URL seperti `http://127.0.0.1:3001/api`. Seluruh endpoint mengembalikan JSON. Request data/mutasi memakai `Authorization: Bearer <accessToken>`. Login tidak memerlukan token. Backend memvalidasi token dan peran admin, bukan mempercayai cookie atau field dari frontend.

## Endpoint

| Method | Path setelah base URL                                                 | Respons                                       |
| ------ | --------------------------------------------------------------------- | --------------------------------------------- |
| POST   | `/auth/login`                                                         | `{ "accessToken": "...", "expiresIn": 3600 }` |
| GET    | `/orders`, `/services`, `/staff`, `/faqs`, `/schedules` | `{ "data": [...] }`                           |
| GET    | `/<resource>/:id`                                                     | `{ "data": { ... } }`                         |
| POST   | `/services`, `/staff`, `/faqs`, `/schedules`                          | 201, `{ "data": { ...record, "id": "..." } }` |
| PATCH  | `/<resource>/:id`                                                     | 200, `{ "data": { ...record } }`              |
| DELETE | `/<resource>/:id`                                                     | 200 JSON `{ "message": "Data dihapus." }`     |

Daftar saat ini diharapkan lengkap, belum menggunakan pagination API. Filter/search/pagination FAQ dihitung di RSC dari respons daftar. Untuk volume besar, sepakati query pagination server sebelum mengubah kontrak; jangan diam-diam mengembalikan hanya halaman pertama.

## Aksi web admin

| Menu     | Aksi                                         |
| -------- | -------------------------------------------- |
| Pesanan  | Assign petugas, read, update, delete         |
| Jadwal   | Create, read, update, delete shift kerja petugas |
| Layanan  | Create, read, update, delete                 |
| FAQ      | Create, read, update, delete                 |
| Customer | Read, update, delete; pendaftaran lewat aplikasi |
| Petugas  | Create, read, update, delete                 |

Pesanan dibuat melalui aplikasi pelanggan; `/pesanan/new` tidak tersedia. Jadwal adalah shift kerja petugas yang dibuat admin melalui popup atau `/jadwal/new`, bukan salinan pesanan customer. Backend harus mendukung POST `/schedules` dan tetap memeriksa kewenangan admin.

Daftar pesanan di web diurutkan dari aktivitas terbaru sebelum filter status, pencarian, dan tanggal diterapkan. Sertakan `orders.createdAt` dan `updatedAt` berupa waktu ISO 8601 dengan zona waktu (alias `created_at` dan `updated_at` juga diterima). `createdAt` tetap, sedangkan `updatedAt` berubah setelah penyuntingan, penugasan, atau perubahan tahap pekerjaan. Frontend memakai waktu terbaru dari field pesanan dan aktivitas tugas petugas; membuka detail atau memuat ulang tidak dihitung sebagai aktivitas. Data lama tanpa timestamp memakai `date` sebagai cadangan; tanggal yang sama mempertahankan urutan respons API.

`orders.notes` adalah catatan pelanggan untuk pesanan tersebut; catatan tidak ditampilkan pada profil customer. Detail pesanan tetap menampilkan bagian catatan saat kosong. `orders.time` tetap menyimpan slot booking lengkap untuk validasi ketersediaan shift. Di daftar/detail, pesanan yang belum selesai hanya menampilkan jam mulai booking. Untuk pesanan Selesai, kirim `startedAt` dan `completedAt` (ISO 8601 dengan zona waktu; alias snake_case diterima) sebagai waktu pengerjaan aktual. Jika tidak ada pada order, frontend membaca catatan tugas selesai dari GET `/cleaner-tasks` untuk petugas yang masih ditugaskan. Untuk beberapa petugas, rentang aktual dihitung dari mulai paling awal sampai selesai paling akhir setelah semua catatan lengkap. Tanpa catatan lengkap, jam pengerjaan ditampilkan belum tercatat; jam akhir booking tidak dijadikan waktu selesai.

Aturan tampilan waktu yang sama digunakan pada dashboard, daftar pesanan, detail, riwayat customer, Pantau Petugas, dan halaman cleaner. Board admin tetap menyimpan `time` sebagai slot booking dan menyediakan `startedAt`/`completedAt` terpisah untuk rentang aktual pesanan. `revision` adalah sidik perubahan data orders, staff, dan tugas, dipakai frontend untuk memperbarui RSC otomatis tiap 5 detik saat halaman aktif, juga saat fokus kembali. Polling berhenti sementara saat tab tersembunyi atau admin mengetik. Modal Pantau Petugas memiliki polling sendiri. API harus memperbarui status order dan catatan tahap tugas secara konsisten; job selesai dan hasil kirim laporan tetap dua status terpisah.

DELETE selalu melalui dialog konfirmasi nama dan ID. Backend menentukan kebijakan data yang masih memiliki relasi atau transaksi. Jika penghapusan ditolak, kembalikan status 409 dengan `message` yang menjelaskan alasannya; frontend mempertahankan dialog dan menampilkan pesan tersebut. Penghapusan customer tidak diasumsikan menghapus akun atau seluruh pesanan, dan penghapusan petugas tidak diasumsikan menghapus riwayat penugasan.

PATCH harus mendukung payload parsial. Penugasan memakai `PATCH /orders/:id` dengan `{ "staff": ["Nama Petugas"], "status": "Menunggu Lokasi" }`. Tidak ada endpoint terpisah `/assignment` dalam implementasi sekarang. Backend memeriksa ketersediaan petugas secara atomik dan memperbarui relasi/status yang relevan. Sebaiknya nama tampilan unik untuk kontrak sementara ini; jika backend memilih ID petugas, ubah kontrak dan form frontend bersama sebelum integrasi.

## Login

```json
{ "username": "admin@cleango.id", "password": "321321", "remember": true }
```

Backend tim menyediakan akun seed **admin@cleango.id / 321321** dan memverifikasi password. Akun **admin/admin** hanya digunakan oleh API preview lokal terpisah. Frontend menyimpan token sebagai cookie `cleango-session` HttpOnly, SameSite=Lax dan Secure pada produksi. `remember` mengatur cookie persisten maksimal 7 hari atau `expiresIn`, mana yang lebih pendek. Jika tidak dicentang, cookie sesi browser. API tetap menentukan kedaluwarsa token. Logout frontend menghapus cookie; jika backend mengharuskan revokasi token, tambahkan endpoint logout dan panggil dari `logoutAction`.

## Bentuk data

Semua `id` berupa string. Harga berupa number rupiah, tanggal `YYYY-MM-DD`, boolean dikirim sebagai boolean, bukan `0`/`1` atau string. `staff` pada orders berupa array string dan `features` services berupa array string (boleh kosong). Tipe lengkap ada di `types/index.ts`.

| Resource  | Field                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------- |
| orders    | `id`, `customer`, `address`, `service`, `price`, `date`, `time`, `staff: string[]`, `status`, `notes` |
| services  | `id`, `name`, `category`, `duration`, `price`, `description`, `active: boolean`, `features: string[]` |
| staff     | `id`, `name`, `skills: string[]`, `phone`, `status`                                                   |
| customers | `id`, `name`, `phone`, `email`, `address`, `joined`, `active: boolean`                                |
| faqs      | `id`, `category`, `question`, `answer`, `published: boolean`                                          |
| schedules | `id`, `date`, `time` (rentang jam), `staff: string` (satu petugas), `status`                                |

Nilai enum:

- Pesanan: `Menunggu Assign`, `Menunggu Lokasi`, `Menuju Lokasi`, `Sedang Dikerjakan`, `Selesai`, `Batal`. Nilai lama `Menunggu Lokasi` ditampilkan sebagai **Siap Berangkat** untuk kompatibilitas API.
- Petugas: `Tersedia`, `Bertugas`, `Masa Training`, `Nonaktif`.
- Jadwal: `Terjadwal`, `Berlangsung`, `Selesai`, `Nonaktif`.
- Kategori layanan dan FAQ mengikuti daftar `/categories`; nama kategori bukan enum tetap.

`time` untuk shift dan penugasan harus berupa rentang jam valid, misalnya `11.00–14.00 WIB`. Pilihan shift memakai satu definisi di `lib/resources.ts`: pagi 08.00–12.00, siang 13.00–17.00, sore 18.00–21.00 WIB. Frontend hanya menawarkan petugas tersedia dengan shift Terjadwal/Berlangsung pada tanggal yang sama dan mencakup seluruh rentang jam pesanan. Petugas yang sedang menuju lokasi/bekerja tidak ditawarkan untuk tugas baru meskipun jam booking tidak bertumpuk; petugas Bertugas juga tidak ditawarkan untuk penugasan baru. Reservasi tugas lain yang belum berjalan tetap menghalangi jam yang bertumpuk. Kru yang tahap individunya sudah completed tidak dianggap sibuk hanya karena rekan satu pesanannya masih bekerja. Batas waktu yang bertemu (08–12 dan 12–13) tidak bertumpuk. Backend wajib mengulang pemeriksaan ini secara atomik saat PATCH orders, serta menolak shift bertumpuk untuk petugas/tanggal sama. API yang hanya menyediakan jam mulai harus ditambah jam selesai; frontend tidak menebak durasi. Dashboard/notifikasi memakai urutan aktivitas terbaru yang sama.

Label **Direkomendasikan** pada pilihan penugasan berasal dari kecocokan `staff.skills` dengan layanan pesanan. Kandidat yang cocok diurutkan lebih awal dan keahliannya tetap ditampilkan. Rekomendasi tidak melewati aturan shift/ketersediaan dan tidak memilih petugas secara otomatis.

## Error dan status

Field tambahan opsional untuk revisi desain:

- `orders.customerId: string` untuk pencocokan pelanggan yang stabil; `paymentMethod: string`, `invoiceId: string` bila tersedia. Ringkasan tetap berdasarkan order selesai, bukan klaim pembayaran lunas.
- `services.packageLabel: string`, `isFavorite: boolean`.
- `staff.rating: number`. Tanpa data rating tidak ada badge angka; keahlian (`skills`) diisi lewat form, satu per baris. `area` lama boleh dipertahankan di API, tetapi tidak lagi diedit oleh form petugas.
- `customers.area: string`, `orderCount: number`, `totalSpent: number`. `totalSpent` adalah nilai order selesai. Jika agregat tidak tersedia, frontend menghitung dari orders: memakai customerId, lalu kecocokan nama persis untuk kontrak lama.
- `faqs.viewCount: number`, `updatedAt: string` tanggal ISO. Statistik pembaca/waktu tidak dipalsukan bila tidak tersedia.
- Field customer/service/address pada schedules lama boleh tetap dikembalikan untuk kompatibilitas, tetapi tidak dipakai sebagai identitas kartu shift. Area kartu diambil dari staff.area.

Field-field ini tidak diwajibkan dalam form CRUD dasar. PATCH parsial harus mempertahankan field lain. Status tampilan petugas mengikuti tahap tugas individunya: assigned menjadi “Siap Berangkat”, en_route menjadi “Menuju Lokasi”, dan working menjadi “Sedang Bekerja”. Tanpa tugas berjalan, `Tersedia` ditampilkan “Siaga & Tersedia”; `Bertugas` tanpa rincian tahap tetap ditampilkan “Bertugas” dan tidak dianggap bukti waktu pengerjaan. `Masa Training` merupakan status tersendiri, bukan pengganti `Nonaktif`. Form penugasan dan editor pesanan menggunakan aturan shift yang sama. Petugas training/nonaktif tidak ditawarkan untuk penugasan baru, tetapi nama yang sudah tercatat pada pesanan tetap ditampilkan agar riwayat tidak hilang saat detail lain diubah. Tab Nonaktif muncul ketika ada data nonaktif atau filter Nonaktif sedang dibuka.

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

## Kategori dan foto layanan (revisi 14 Oktober 2026)

Kategori layanan dan FAQ mengikuti data backend. Jika registri kategori mengembalikan 404, frontend menggunakan kategori yang sudah tercatat pada layanan/FAQ. Error autentikasi dan gangguan API tetap ditampilkan.

| Method | Path                                                 | Request / respons                                                                                                                                 |
| ------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/categories?resource=services` atau `resource=faqs` | `{ "data": [{ "id": "CAT-01", "resource": "services", "name": "Rumah" }] }`                                                                       |
| POST   | `/categories`                                        | `{ "resource": "services", "name": "Perawatan taman" }`; respons `{ "data": { "id": "...", "resource": "services", "name": "Perawatan taman" } }` |
| POST   | `/uploads`                                           | Multipart `file` + `purpose=service`; respons `{ "data": { "url": "https://.../layanan.jpg" } }`                                                  |

Revisi 16 Oktober: form tambah/edit layanan hanya mengelola harga normal, nama, kategori, durasi, deskripsi, fasilitas, foto utama, dan status aktif. Diskon dikelola terpusat lewat Kelola Promo. Field foto:

```json
{
  "imageUrl": "https://cdn.example.com/layanan.jpg"
}
```

`price` adalah harga normal. Daftar dan detail layanan selalu menampilkan harga normal. `discountPrice` tidak lagi menjadi input; frontend mengirim `null` saat menyimpan untuk membersihkan harga promo lama. Backend boleh tidak mengembalikan field legacy tersebut bila sudah tidak digunakan. `features` tetap array string.

Foto menerima JPG/PNG maksimal 5 MB. Upload dilakukan sebelum POST/PATCH layanan. URL lama dipertahankan saat tidak ada perubahan foto; `imageUrl: null` menghapus foto dari layanan. URL HTTP(S) direkomendasikan agar dapat digunakan oleh web dan mobile. Backend memvalidasi isi berkas, menyimpan foto, dan membersihkan upload yang tidak terpakai.

Halaman/tab Promo Beranda dihapus. Tombol Tambah Banner Promo berada di sebelah Tambah Promo dalam Kelola Promo. Form banner hanya meminta gambar JPG/PNG/WebP maksimal 2 MB; upload menggunakan `/uploads` dengan `purpose=promotion`, lalu POST `/banners` dengan JSON `{ "imageUrl": "..." }`. Respons penyimpanan `{ "data": { "id": "...", "imageUrl": "..." } }`. Setelah tersimpan, pengguna kembali ke Kelola Layanan. URL lama `/layanan?view=promos` menampilkan daftar layanan biasa.

Backend perlu menyimpan dan mengembalikan `imageUrl` dan harga normal pada GET/POST/PATCH layanan serta menyediakan endpoint upload. Perhitungan diskon memakai resource promo, bukan harga promo layanan terpisah. Perilaku frontend telah diuji melalui API preview lokal; penyimpanan database dan tampilan mobile menjadi pekerjaan tim backend/mobile.

## Kecocokan mobile dan status penugasan

Penugasan petugas mengubah pesanan menjadi `Menunggu Lokasi` (label Siap Berangkat), bukan langsung `Sedang Dikerjakan`. Keberangkatan mengubahnya menjadi `Menuju Lokasi`. Pesanan yang sudah memiliki petugas tidak dihitung sebagai perlu ditugaskan. `Menunggu Lokasi`, `Menuju Lokasi`, `Sedang Dikerjakan`, dan `Selesai` memerlukan daftar petugas. Backend tim perlu mengembalikan tahap dan timestamp individu lewat kontrak cleaner-tasks agar web/mobile memakai sumber aktivitas yang sama.

Foto, promo, dan keahlian divalidasi terhadap respons simpan agar field yang diabaikan API tidak dilaporkan berhasil. Sebagian field lain dapat sudah tersimpan; form menjelaskan kondisi tersebut dan mempertahankan input. Lihat [audit mobile/API](app-compatibility-2026-10-14/README.md) untuk daftar integrasi yang belum tersedia.

## Pengelolaan kode promo (15 Oktober 2026)

Kelola Promo berada di sebelah Tambah kategori pada Kelola Layanan. Seluruh diskon dikelola di sini dan dihitung dari `services.price`. Tombol Tambah Banner Promo berada di sebelah Tambah Promo dalam Kelola Promo. Ubah Layanan hanya menerima harga normal. Tidak ada opsi penggabungan diskon layanan.

Endpoint berikut merupakan kontrak tambahan untuk anggota backend, belum tersedia di backend tim yang terakhir diperiksa. Data awal dimuat oleh Server Component. Mutasi melalui Server Actions dengan token admin dan revalidasi `/layanan`; tidak ada data bisnis pengganti yang disimpan di browser.

| Method | Path          | Request / respons                                                      |
| ------ | ------------- | ---------------------------------------------------------------------- |
| GET    | `/promos`     | `{ "data": [Promo] }`, daftar lengkap                                  |
| GET    | `/promos/:id` | `{ "data": Promo }`                                                    |
| POST   | `/promos`     | PromoInput; 201 `{ "data": Promo }`                                    |
| PATCH  | `/promos/:id` | PromoInput atau `{ "active": false }`; 200 `{ "data": Promo }` lengkap |
| DELETE | `/promos/:id` | 200 JSON `{ "message": "Promo dihapus." }`                             |

Contoh Promo, sesuai `types/promos.ts`:

```json
{
  "id": "PRM-01",
  "name": "Hemat Bersih Oktober",
  "code": "CLEANHEMAT",
  "discountType": "percentage",
  "discountValue": 35,
  "maxDiscount": 50000,
  "minPurchase": 100000,
  "scope": "services",
  "serviceIds": ["SRV-01", "SRV-03"],
  "startsOn": "2026-10-15",
  "endsOn": "2026-10-31",
  "usageLimit": 100,
  "perCustomerLimit": 1,
  "stackable": false,
  "active": true,
  "usedCount": 0
}
```

PromoInput memakai field yang sama tanpa `id` dan `usedCount`. Semua field konfigurasi wajib ada dalam respons, termasuk `null` untuk `maxDiscount`/`usageLimit` yang tidak dibatasi. `usedCount` opsional pada respons; hanya backend yang dapat memperbaruinya. Field metadata lain boleh ditambahkan.

- `name`: 1–80 karakter. `code`: unik, 3–30 karakter huruf besar/angka, boleh `-`/`_` setelah karakter pertama. Kode dinormalisasi ke huruf besar. Backend menjamin keunikan secara atomik, termasuk saat dua admin menyimpan bersamaan.
- `discountType`: `percentage` atau `fixed`. Persentase bilangan bulat 1–100; nominal rupiah bulat positif. `maxDiscount` hanya untuk persen; `null` pada diskon nominal.
- `minPurchase`: rupiah bulat minimal 0. Nilai 0 berarti tanpa minimal transaksi. `usageLimit`: bilangan bulat positif atau `null`; kuota baru tidak boleh kurang dari `usedCount`. `perCustomerLimit`: bilangan bulat minimal 1.
- `scope=all`: `serviceIds=[]`, termasuk layanan baru di kemudian hari. `scope=services`: satu atau beberapa ID layanan yang valid dan unik. Penghapusan layanan tidak boleh diam-diam mengubah promo menjadi berlaku untuk semua layanan.
- `startsOn` dan `endsOn`: tanggal valid `YYYY-MM-DD`; tanggal akhir tidak lebih awal dari tanggal mulai. Periode inklusif dalam zona `Asia/Jakarta`, sampai akhir hari terakhir.
- `active=false`: kode tidak dapat digunakan. Daftar juga membedakan Dijadwalkan, Berakhir, dan Kuota habis berdasarkan periode/kuota, tanpa mengubah konfigurasi admin.
- `stackable` dipertahankan sebagai field kompatibilitas bernilai `false`. Opsi penggabungan dihapus; seluruh preview diskon memakai harga normal `services.price`. Backend harus mengikuti aturan yang sama saat checkout. Penggabungan beberapa kode tidak tersedia.

Contoh perhitungan satu layanan: harga Rp350.000, diskon 35% menghasilkan Rp122.500. Dengan `maxDiscount=50000`, potongan menjadi Rp50.000 dan harga setelah kode Rp300.000. Potongan persen dibulatkan ke rupiah terdekat, dibatasi `maxDiscount` bila ada, lalu dibatasi sebesar harga layanan. Nominal tidak boleh menghasilkan total negatif. Biaya platform/biaya lain tidak termasuk contoh ini.

Frontend memvalidasi isian dan memeriksa konfigurasi yang dikembalikan POST/PATCH; field yang diabaikan API tidak ditampilkan sebagai berhasil tersimpan. GET `/promos` yang belum tersedia atau gagal ditampilkan di dialog; katalog layanan tetap dapat dibuka. Error validasi memakai format `errors` umum di atas, misalnya `errors.code` atau `errors.serviceIds`.

Backend perlu memeriksa role admin pada semua endpoint ini. Saat checkout, backend menghitung ulang harga dari data layanan, memvalidasi kode/periode/cakupan/minimum/kuota/pelanggan, serta mencatat pemakaian secara atomik. Nilai diskon atau total dari klien tidak dapat dijadikan harga pembayaran. Order menyimpan rincian promo/harga saat transaksi agar perubahan promo berikutnya tidak mengubah riwayat. Untuk promo yang sudah digunakan, penonaktifan disarankan; DELETE dapat ditolak dengan 409 sesuai relasi/riwayat.

Anggota mobile perlu mengganti voucher CLEANHEMAT yang masih statis dengan validasi checkout dari API tim. Endpoint validasi/penerapan kode checkout belum ditentukan oleh frontend admin; sepakati bersama backend/mobile sebelum integrasi. Implementasi admin ini belum membuktikan kuota atau pembayaran berjalan di aplikasi.

## Pemeriksaan lanjutan — 15 Oktober 2026

Frontend memeriksa hasil penugasan: respons `PATCH /orders/:id` harus mengembalikan ID pesanan yang sama, daftar petugas yang dipilih, dan status `Menunggu Lokasi`. Perubahan status/petugas melalui Ubah Pesanan juga diperiksa terhadap respons simpan. Penugasan baru lewat form ubah menolak nama yang tidak tersedia di data petugas atau berstatus training/nonaktif; petugas lama pada pesanan tetap boleh dipertahankan untuk menjaga riwayat. Status `Menunggu Assign` tidak boleh dikirim bersama petugas yang sudah dipilih.

POST kategori wajib mengembalikan ID, `name`, dan `resource` yang benar. POST/PATCH banner wajib mengembalikan URL gambar yang baru disimpan. Respons tidak lengkap tidak dilaporkan sebagai berhasil. Semua harga transaksi menggunakan rupiah bulat, minimal nol; harga dasar layanan tetap harus lebih dari nol.

Respons API berupa JSON `null`, array tanpa envelope, HTML, atau pesan/field error yang tidak sesuai ditangani sebagai respons tidak valid. HTTP 401 tetap mengalihkan ke login walaupun body error tidak valid. Backend tetap bertanggung jawab memvalidasi seluruh field, izin, konflik penugasan, dan penyimpanan database. Bukti pengujian frontend ada di [audit menyeluruh](final-audit-2026-10-15/README.md).

## Popup detail petugas

`/petugas/:id` menampilkan popup di atas daftar petugas. Profil memakai GET `/staff/:id`; tugas aktif dan jumlah pesanan selesai dihitung dari GET `/orders`, sedangkan jadwal dari GET `/schedules`. Relasi sementara menggunakan nama petugas, sesuai kontrak penugasan di atas. Kegagalan memuat jadwal tidak menutup profil; bagian tersebut menampilkan pesan belum dapat dimuat. GET `/orders` juga dipakai notifikasi pada layout admin; kegagalan di layout tersebut tetap memakai halaman error bersama.

Bagian **Tugas aktif saat ini** hanya menampilkan tugas individu en_route/working. Penugasan yang baru assigned, jadwal mendatang, tugas completed, dan pesanan Batal tidak mengisi bagian tersebut. Bila API lama belum memiliki tahap individu, hanya status pesanan Menuju Lokasi/Sedang Dikerjakan yang menjadi cadangan. Tanpa tugas berjalan, tampilkan keadaan kosong. Data cleaner-tasks memperbarui status ini bersama waktu pengerjaan di halaman admin.

Detail customer menghitung **Nilai pesanan selesai**, jumlah selesai, **Layanan favorit**, dan **Kru langganan** dari pesanan berstatus Selesai milik customer tersebut. Total memakai harga transaksi, layanan favorit memakai frekuensi layanan, dan kru langganan memakai frekuensi penugasan per pesanan selesai tanpa menggandakan nama kru pada satu pesanan. Jika frekuensi sama, aktivitas pesanan selesai terbaru menjadi penentu. Customer tanpa pesanan selesai menampilkan keadaan kosong, bukan nilai favorit bawaan dari seed. Riwayat tetap memuat seluruh status pesanan.

Field `staff.joined` opsional berupa tanggal ISO; `area` dan `rating` juga opsional. Rating hanya ditampilkan untuk nilai valid 0–5. Tanggal atau keahlian yang belum tersedia ditandai sebagai belum diisi. Tidak ada angka kehadiran atau kepuasan pelanggan contoh.

Tombol Hubungi WhatsApp dan Salin tautan membuat `https://wa.me/<nomor>?text=<pesan>` dari `staff.phone`. Nomor Indonesia `08…` atau `8…` dinormalisasi ke `628…`; format `62…`, `+62…`, `0062…`, serta nomor internasional dengan awalan `+`/`00` didukung. Spasi, tanda hubung, titik, dan tanda kurung dibersihkan. Nomor kosong atau format tidak valid menonaktifkan kontak. Membuka tautan hanya menyiapkan percakapan dengan draf pesan; admin tetap mengirim pesannya sendiri. Tidak memerlukan endpoint pengiriman pesan baru.

## Popup detail seluruh menu

Route detail Pesanan, Jadwal, Layanan, Customer, dan FAQ juga menampilkan popup di atas daftar. Route tetap tersedia untuk tautan dashboard, notifikasi, dan akses langsung. Seluruh data tetap dimuat di server; popup tidak memerlukan endpoint detail tambahan. Filter/pagination dikembalikan melalui `returnTo` yang hanya mengizinkan path daftar resource yang sama dan parameter `q`, `tab`, `from`, `to`, `page`.

Pesanan memakai form Detail & Ubah dengan layanan dari katalog, status, tanggal/jam, penugasan beberapa petugas, alamat, biaya, dan catatan. Memilih Batalkan Pesanan menyiapkan status Batal; PATCH baru dilakukan setelah Simpan Perubahan. Kontak pelanggan diambil dari relasi `customerId` atau nama yang sama, dan ditampilkan sebagai informasi kontak. Kegagalan lookup katalog/kontak tidak menghapus nilai pesanan yang sudah ada. Tidak ada klaim pengiriman notifikasi WhatsApp otomatis.

Jadwal memakai kontrak shift petugas: `staff`, `date`, `time`, `status`; customer/service tidak wajib. Detail baca terpisah dari editor. Pilihan shift mengisi rentang `time`, yang dapat disesuaikan. Pesanan terhubung dihitung berdasarkan petugas, tanggal, dan cakupan waktu shift; bukan seluruh pesanan pada tanggal itu. Perubahan atau penghapusan shift yang masih mencakup pesanan aktif harus ditolak 409 apabila penugasan menjadi tidak valid; admin perlu memindahkan penugasan pesanan dahulu. Status selesai pesanan tidak otomatis menutup shift kerja. Kuota per shift, cuti/pelatihan, dan auto-assign belum diimplementasikan. Mode demo frontend mendukung alur ini; implementasi backend tim masih perlu diselaraskan.

Customer menampilkan transaksi selesai yang tercatat, `totalSpent` bila tersedia (fallback penjumlahan order selesai), layanan/kru yang paling sering tercatat, serta riwayat pesanan. `crewRating` dan `notes` opsional; data kosong ditandai, bukan diisi angka/catatan contoh. FAQ memakai `viewCount`/`updatedAt` opsional; label terverifikasi tim tidak ditampilkan tanpa datanya. Layanan menampilkan foto, deskripsi, fasilitas, harga dasar/promo dan publikasi; Ubah Layanan membuka editor foto/harga yang sudah tersedia dalam popup yang sama.

## Halaman tugas cleaner dan dispatch

Frontend menyediakan `/tugas/:token` di luar layout admin, serta BFF `/api/tugas/:token` dan `/api/admin/cleaner-tasks`. URL tugas yang sama dibuka dalam iframe popup Pantau Petugas dan sebagai halaman penuh di HP. Tidak ada daftar pesanan atau API admin pada halaman publik. BFF publik hanya mengirim Bearer token tugas ke API, tanpa cookie/token sesi admin. Backend wajib memperlakukan token sebagai akses terbatas pada satu pasangan pesanan–petugas, memeriksa masa berlaku, dan mencabutnya ketika penugasan berubah atau pesanan dibatalkan.

Endpoint berikut adalah kontrak tambahan **yang belum tersedia pada backend tim yang diperiksa**. Implementasi saat ini lengkap untuk data `[UJI]` dengan penyimpanan lokal server dan pengiriman simulasi. Tidak ada perubahan pada backend/mobile.

| Method | API backend (relatif `API_URL`) | Kegunaan |
| --- | --- | --- |
| GET | `/cleaner-tasks` | Admin: `{data:[{task:CleanerTask,publicPath:"/tugas/<token>"}]}` |
| POST | `/orders/:id/cleaner-tasks` | Admin: buat/ambil tugas dan kirim link; body `{}` saat penugasan, `{staffName,resend:true}` saat kirim ulang |
| GET | `/cleaner-task` | Bearer token tugas: `{data:CleanerTask}` untuk penugasan tersebut saja |
| POST | `/cleaner-task/events` | Bearer token tugas + `Idempotency-Key`; simpan tindakan dan kembalikan `{data:CleanerTask}` |
| POST | `/cleaner-task/photos` | Bearer token tugas; multipart field `file`, satu JPG/PNG maksimal 2 MB |
| GET | `/cleaner-task/photos/:id` | Bearer token tugas; verifikasi kepemilikan foto sebelum mengirim bytes JPG/PNG |

Tipe lengkap ada di `types/cleaner.ts`. Field tugas: `id,orderId,staffId,staffName,customer,customerPhone,address,date,time,service,notes,orderStatus,stage,demo,updatedAt,expiresAt,photos,linkDelivery,reportDelivery`. Timestamp opsional `departedAt,arrivedAt,startedAt,completedAt` adalah ISO dari server. `photos` berisi `{id,type}`, tanpa URL publik permanen. `report` berisi `{summary,checked}`. `location` opsional `{latitude,longitude,updatedAt}`. Data customer/layanan/jadwal harus mengikuti pesanan yang sama dengan dashboard. Backend tidak boleh menyalin seluruh objek customer/admin ke respons publik.

Body event memakai `{kind,key,...}`. `key` adalah ID tindakan 8–100 karakter; HTTP `Idempotency-Key` memakai nilai yang sama. Jenis tindakan:

- `depart`: `assigned → en_route`, catat `departedAt` sekali.
- `arrive`: `en_route → working`, catat `arrivedAt` dan `startedAt` sekali. Konfirmasi manual ini digunakan karena integrasi GPS otomatis belum tersedia.
- `complete`: hanya `working`, wajib `summary` 10–2000 karakter setelah trim dan `checked=true`. Simpan laporan, `completedAt`, dan `stage=completed` dahulu, kemudian proses pengiriman laporan ke `customerPhone` dari pesanan tersebut.
- `retry_report`: tugas sudah selesai dan laporan ada; ulangi pengiriman gagal tanpa menulis ulang laporan/timestamp.
- `location`: koordinat valid `latitude -90..90`, `longitude -180..180`, hanya untuk tugas aktif.
- `remove_photo`: `photoId` harus milik tugas; hanya saat `working`.

Backend perlu transaksi/idempotensi untuk mencegah klik bersamaan menggandakan timestamp, laporan, maupun pengiriman. Pesanan menjadi `Menunggu Lokasi` saat ditugaskan, `Menuju Lokasi` saat kru berangkat, `Sedang Dikerjakan` bila salah satu kru bekerja atau selesai sementara kru lainnya belum selesai, dan `Selesai` setelah seluruh kru pada pesanan selesai. Timestamp dan laporan tidak boleh berasal dari jam klien. Status aktif petugas memakai tahap individunya, bukan tahap rekan satu pesanan.

Membuka riwayat pesanan Selesai tidak membuat catatan tugas atau waktu selesai baru. Jika tugas historis sudah ada, pertahankan timestamp/laporan/fotonya saat memperbarui masa berlaku link. Tahap historis tanpa timestamp ditampilkan “Tidak tercatat”; status completed tidak mengisi otomatis waktu berangkat/tiba/mulai. Tanpa laporan, halaman menyatakan laporan belum ada dan tidak menampilkan klaim “Laporan Tersimpan” atau status pengiriman laporan. Tanpa task historis, tombol Buka Halaman Petugas dinonaktifkan.

Pengiriman link dipanggil **setelah PATCH penugasan berhasil disimpan dan diverifikasi**. Frontend mengirim `Idempotency-Key: assignment-<hash order + daftar kru>` pada dispatch awal. Kegagalan dispatch tidak membatalkan penugasan. Backend sebaiknya memakai outbox/antrean tahan restart agar crash antara simpan dan kirim tidak menghilangkan pengiriman. Atur alamat frontend publik di backend untuk membuat link; jangan memakai origin provider/chatbot.

`Delivery` memakai `{status,mode,attempts,updatedAt?,message?,providerMessageId?,draftUrl?}`. Status: `not_sent`, `sending`, `sent`, `failed`, `simulated`, atau `manual_ready`. Mode: `chatbot`, `simulation`, atau `manual`. `sent` hanya diterima frontend bila ada `providerMessageId` dan mode `chatbot`; ini berarti provider menerima pengiriman, bukan klaim sudah dibaca penerima. `simulated` tidak boleh diberi label Terkirim. `manual_ready` boleh menyertakan `https://wa.me/<nomor>?text=<pesan>`; pengguna tetap menekan kirim sendiri. Draf laporan harus memakai nomor customer, sedangkan draf penugasan memakai nomor petugas. Jangan mengirim nomor atau kunci provider dari browser.

Sesudah laporan tersimpan, frontend juga menyiapkan cadangan draf laporan dari `customerPhone`, `report.summary`, layanan, petugas, dan waktu selesai pada tugas itu. Nomor pada draft URL dari API tidak dipakai sebagai sumber penerima laporan. Draf link penugasan mengambil nomor dari data petugas yang sama. Cadangan manual tidak mengubah status pengiriman menjadi Terkirim, dan dinonaktifkan pada data/mode simulasi. API tetap bertanggung jawab menyimpan laporan dan status pengiriman yang sebenarnya.

Simpan status pengiriman link dan laporan secara terpisah dari stage pekerjaan. Respons complete tetap memuat pekerjaan selesai bila provider gagal; tampilkan `reportDelivery.status=failed`, pesan singkat, dan izinkan retry. Provider harus mengelola idempotensi pengiriman, retry/backoff, kegagalan terputus, serta webhook sesuai integrasinya. Foto tersimpan bersama laporan; mode manual menjelaskan bahwa foto perlu dilampirkan sendiri. Jangan menyatakan foto telah dikirim ke WA bila integrasi tidak mendukungnya.

Respons error memakai `{message}` dengan 400 validasi, 401 sesi admin, 403 link/asal tidak sah, 404 foto/tugas tidak ada, 409 urutan tindakan tidak valid, 410 kedaluwarsa, 413 ukuran berlebih, 429 pembatasan permintaan, serta 502/503 gangguan layanan. BFF membatasi body, memeriksa Origin pada mutasi, memberi header no-store/no-referrer, dan memproksi foto melalui token tugas. Produksi tetap membutuhkan HTTPS, pembatasan permintaan terpusat, role admin pada endpoint admin, token tugas yang tidak ditebak dan berumur terbatas, serta pencabutan akses di backend.

Mode uji diaktifkan dengan `CLEANER_DEMO_ENABLED=true`. Seed/reset hanya tersedia melalui sesi admin yang diverifikasi API. ID `DEMO-*` dan petugas `[UJI]` terpisah dari data API tim. Semua pengiriman untuk data tersebut selalu simulasi, termasuk bila nomor kontaknya diedit. Seed idempotent, reset menghapus progres/foto/link tugas uji lama, dan penyimpanan `.local/cleaner-demo` tidak masuk Git/build. Mode ini untuk satu proses frontend dan satu disk lokal; gunakan database dan penyimpanan file backend untuk produksi.


## Revisi alur admin 16 Oktober 2026

Customer dibuat dari aplikasi pelanggan. Admin tidak menyediakan tombol/route create; POST customer tidak dipanggil oleh form admin. Jadwal tetap dapat mengembalikan customer/service untuk relasi historis, tetapi PATCH dari editor admin hanya berisi staff, date, time, status. Field nama pelanggan dan layanan dihapus dari editor. Detail pesanan/jadwal berupa ringkasan baca; tombol Ubah membuka editor terpisah.

Pantau Petugas mengelompokkan task per staffId (fallback nama pada kontrak lama) dan menyertakan daftar petugas tanpa tugas. Respons BFF TaskBoard mempunyai field staff opsional berisi id/name/status. Lokasi terakhir berdasarkan timestamp lokasi ditampilkan pada tombol Lokasi Petugas di samping Buka Halaman Petugas. Tidak ada klaim GPS nyata dari koordinat contoh.
