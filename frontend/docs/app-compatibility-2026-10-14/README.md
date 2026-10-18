# Audit web admin, mobile, dan API — 14 Oktober 2026

Pemeriksaan memakai kode frontend aktif, salinan Flutter di `C:\Users\athlon\Documents\CleanGo-app-main`, screenshot Figma yang diberikan, PRD di folder induk, dan backend pada `origin/main` commit `192c4d9`. Folder mobile dibaca sebagai referensi. Perubahan implementasi dilakukan pada frontend web admin.

## Hasil utama

Alur web admin sudah menyediakan kebutuhan pengelolaan yang diminta. Namun, perubahan admin belum otomatis tersinkron ke mobile: banner, katalog, FAQ, pesanan, dan autentikasi pada salinan Flutter masih berupa data/simulasi lokal. Empat berkas `lib/core/network/api_*.dart` masih kosong. Backend `main` juga belum menyediakan semua endpoint dan field yang digunakan frontend.

## Perbaikan frontend

- Tombol **Atur Promo** tersedia di setiap layanan dan membuka form dengan fokus pada Harga promo. Layanan yang memiliki diskon menampilkan **Ubah Promo**, badge Promo, serta harga dasar yang dicoret.
- Harga promo dapat diubah atau dikosongkan untuk mengakhiri promo. Ini harga diskon per layanan; form tersebut tidak membuat kode voucher checkout.
- **Tambah Banner Promo** tetap berada di sebelah **Tambah Layanan Baru**. Banner hanya gambar; halaman/tab Promo Beranda tetap dihapus.
- Penugasan petugas menghasilkan status **Menunggu Lokasi**. Pengerjaan baru dianggap berjalan saat status berubah menjadi **Sedang Dikerjakan**.
- Tab Menunggu Lokasi ditambahkan. Pesanan yang sudah mempunyai petugas tidak lagi dihitung sebagai perlu ditugaskan atau diberi tombol Tugaskan Petugas lagi.
- Form memeriksa apakah respons simpan benar-benar memuat foto, harga promo, dan keahlian yang dikirim. Jika field diabaikan API, form menampilkan penyimpanan belum lengkap dan mempertahankan isian. Field lain mungkin sudah tersimpan.
- Error dari field backend yang tidak ada pada form tetap ditampilkan, misalnya backend lama yang masih mewajibkan wilayah petugas.
- Bantuan login dan `.env.example` mengikuti backend tim: port 3001 dan akun seed `admin@cleango.id / 321321`. API preview lokal terpisah menggunakan `admin / admin`.

## Pengelolaan admin

| Menu                 | Alur yang diminta                          | Hasil frontend                                             | Backend `main` yang diperiksa                                                          |
| -------------------- | ------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Pesanan              | Assign, read, update, delete; tanpa create | Tersedia; assign tidak langsung memulai pekerjaan          | GET daftar/detail tersedia; PATCH/DELETE belum tersedia                                |
| Jadwal               | Read, update, delete; tanpa create         | Tersedia; berasal dari pesanan pelanggan                   | `/schedules` belum terdaftar                                                           |
| Layanan              | CRUD, foto, fasilitas, status, harga promo | Tersedia; jalur Atur Promo terlihat langsung               | CRUD dasar `/services` tersedia; alias ini belum menyimpan foto/promo                  |
| FAQ                  | CRUD dan tambah kategori                   | Tersedia                                                   | CRUD tersedia; kategori masih enum tetap                                               |
| Customer             | Read, update, delete; create opsional      | Tersedia, termasuk tambah manual                           | `/customers` belum terdaftar                                                           |
| Petugas              | CRUD dengan keahlian                       | Tersedia; keahlian tidak diperlakukan sebagai wilayah      | CRUD masih membutuhkan `area`; `skills` belum didukung                                 |
| Banner               | Unggah gambar beranda mobile               | Dialog dan validasi tersedia                               | `/uploads` dan `/banners` belum terdaftar                                              |
| Kategori layanan/FAQ | Tambah kategori dan filter dinamis         | Tersedia; kategori lama dibaca dari data bila registri 404 | `/categories?resource=...` belum tersedia; `/admin/categories` memakai kontrak berbeda |

Temuan backend berasal dari `backend/src/routes/index.ts`, `routes/order.routes.ts`, `controller/service.controller.ts`, `model/platform-service.model.ts`, `controller/staff.controller.ts`, dan `controller/faq.controller.ts` pada commit yang disebutkan. Endpoint `/admin/services` mendukung `imageUrl`, tetapi schema-nya berbeda dari `/services`; tidak dapat diganti langsung tanpa pemetaan kategori, ID, durasi, dan fasilitas. Harga promo belum ada di kedua kontrak.

## Pemetaan ke mobile

| Data/fitur       | Web admin/API yang diharapkan                                             | Kondisi salinan mobile                                                                                                   | Pekerjaan integrasi                                                                                                |
| ---------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Banner beranda   | Resource banner berisi `id`, `imageUrl`                                   | `HomeData.promoBanners` menunjuk aset lokal yang sama tiga kali; UI memakai `Image.asset`                                | Ambil daftar gambar dari API dan tampilkan URL jaringan, dengan fallback saat gagal                                |
| Daftar layanan   | `id`, `name`, `category`, `duration`, harga numerik, `imageUrl`, `active` | `ServiceData.services` dan filter kategori berupa konstanta; ID seperti `deep-cleaning`, harga berupa string `Rp150.000` | Gunakan ID dari backend; petakan `name → title`, format rupiah di UI, filter layanan aktif, gunakan foto dari URL  |
| Detail layanan   | Deskripsi dan `features` dari layanan yang sama                           | `ServiceDetailModel.benefits` dan hero foto berasal dari data lokal                                                      | Petakan `features → benefits`; daftar/detail/booking membaca record yang sama                                      |
| Promo layanan    | `price` harga dasar; `discountPrice` harga promo opsional                 | Model layanan belum mempunyai harga promo; badge Promo pada home ditulis tetap                                           | Tambahkan pemetaan harga promo dan badge berdasarkan data; booking memakai harga efektif dari backend              |
| Voucher checkout | Kebijakan voucher terpisah dari gambar dan harga promo                    | `CheckoutController.validPromoCode = CLEANHEMAT`, diskon 35% tetap dalam kode                                            | Sepakati endpoint validasi voucher, cakupan, masa berlaku, serta apakah boleh digabung dengan harga promo          |
| Booking/pesanan  | Mobile membuat booking; admin membaca dan menugaskan                      | `PaymentFlowController` membuat pesanan di `OrderController` lokal, bukan lewat HTTP                                     | Buat booking melalui API; simpan dan baca ID, nominal, pelanggan, jadwal, serta status yang sama di kedua aplikasi |
| FAQ              | FAQ terpublikasi dari data yang dikelola admin                            | `SupportController` menyalin `FaqData.initialFaqs`                                                                       | Sediakan endpoint baca untuk customer dan ambil hanya FAQ yang dipublikasikan                                      |
| Customer/login   | Akun customer dan admin mempunyai peran berbeda                           | Autentikasi mobile simulasi lokal dengan nomor telepon                                                                   | Hubungkan login/register/profile customer; perubahan admin memakai user/customer ID yang sama                      |
| Petugas/tracking | Penugasan dan lokasi berasal dari backend                                 | Timeline, petugas, dan peta memakai contoh lokal                                                                         | Endpoint penugasan dan sumber lokasi perlu implementasi tim; tracking web tetap diberi label Simulasi              |

Sumber mobile: `features/home/data/home_data.dart`, `home/pages/home_page.dart`, `service/data/service_data.dart`, `service/controllers/service_controller.dart`, `service/domain/models/service_model.dart`, `checkout/controllers/checkout_controller.dart`, `checkout/controllers/payment_flow_controller.dart`, `order/controllers/order_controller.dart`, `order/domain/models/order_model.dart`, `support/controllers/support_controller.dart`, dan `auth/data/dummy_auth_service.dart`.

## Login customer

Login customer juga belum memakai kontrak yang sama: form/dummy mobile mengirim nomor telepon, sedangkan `backend/src/controller/customer/auth.controller.ts` meminta email. Validasi password login customer minimal delapan karakter juga berbeda dari akun contoh mobile `321321`. Tim backend/mobile perlu menyamakan identitas login, akun contoh, dan aturan validasi sebelum menghubungkan autentikasi. Akun admin web mempunyai endpoint dan peran tersendiri.

## Status pesanan

| Tahap mobile          | Status database/backend | Status ringkas web admin |
| --------------------- | ----------------------- | ------------------------ |
| Dikonfirmasi          | `confirmed`             | Menunggu Assign          |
| Cleaner ditugaskan    | `assigned`              | Menunggu Lokasi          |
| Cleaner menuju lokasi | `departed` / `en_route` | Menunggu Lokasi          |
| Sedang dikerjakan     | `in_progress`           | Sedang Dikerjakan        |
| Selesai               | `completed`             | Selesai                  |
| Dibatalkan            | `cancelled`             | Batal                    |

Backend saat ini merangkum beberapa status menjadi satu nilai. Agar timeline mobile dapat membedakan sudah ditugaskan dan dalam perjalanan, API perlu mengirim stage/status asli atau riwayat status tambahan. `awaiting_payment` juga masih masuk fallback Menunggu Assign pada mapper backend; tim backend perlu membedakannya dan memeriksa kebijakan pembayaran sebelum penugasan.

Nama petugas masih dipakai oleh kontrak web sementara. Kontrak final sebaiknya mengirim ID petugas untuk penugasan dan menjaga nama sebagai data tampilan. Perubahan status, ketersediaan petugas, dan jadwal harus konsisten dalam satu transaksi backend.

## Harga dan promo

Contoh: harga dasar Rp350.000 dan harga promo Rp299.000 menghasilkan potongan Rp51.000. Web tidak membuat voucher dari nilai ini. Banner juga tidak memberikan diskon dengan sendirinya.

Salinan mobile menghitung voucher CLEANHEMAT sebesar 35% dari harga layanan, lalu menambahkan biaya platform Rp5.000. Perilaku ini belum membaca konfigurasi admin atau aturan backend. Jangan menggandakan potongan harga promo dan voucher tanpa kebijakan yang disepakati. Nominal pembayaran final dan snapshot harga pesanan perlu dihitung/disimpan backend; perubahan katalog tidak boleh mengubah harga pesanan lama.

Laporan admin masih menghitung nilai pesanan berstatus Selesai. Itu belum membuktikan pembayaran diterima. Integrasi laporan pembayaran/invoice perlu data pembayaran dari backend.

## Verifikasi

- Roundtrip Server Actions melalui API preview untuk enam resource: read, update, delete; create layanan/FAQ/customer/petugas lolos. Create pesanan/jadwal ditolak dari admin. [Hasil](roundtrip.json).
- Browser: Atur Promo memfokuskan Harga promo; simpan diskon menampilkan badge Promo dan Ubah Promo; mengosongkannya mengembalikan harga dasar.
- Browser: penugasan CL-8923 ke petugas tersedia menghasilkan Menunggu Lokasi, masuk tab yang sesuai, dan menghilangkan tombol Tugaskan Petugas dari pesanan tersebut. Data preview dikembalikan setelah uji.
- Validasi: foto terlalu besar/non-gambar, harga promo tidak valid, fasilitas terlalu banyak, penugasan ulang melalui aksi assign, serta respons yang membuang foto/promo/keahlian ditolak atau dilaporkan belum lengkap.
- Sembilan halaman lolos 36 pemeriksaan viewport tanpa gulir horizontal. Tombol Atur Promo di layar kecil memfokuskan kolom harga promo dengan footer tetap terlihat. [Hasil responsif](responsive.json), [dialog promo mobile](promo-mobile.png).
- Pengujian ini memverifikasi frontend terhadap API preview. Database Express dan aplikasi mobile belum diuji sebagai satu alur end-to-end karena integrasi di salinan kode belum tersedia.

Build produksi, pemeriksaan TypeScript, format, serta `git diff --check` lolos.

## Bukti tampilan

- [Promo pada layanan](promo-service.png)
- [Pesanan setelah petugas ditugaskan](assignment-waiting-location.png)

## Urutan integrasi tim

1. Backend menyamakan kontrak katalog web/customer, menyimpan foto/harga promo, dan menyediakan upload serta banner.
2. Mobile mengganti sumber data lokal home/katalog/FAQ dengan API, memakai URL gambar dan harga efektif.
3. Backend/mobile menghubungkan booking, pembayaran, assignment, jadwal, dan status pesanan yang sama.
4. Backend melengkapi customer, keahlian petugas, dan kategori dinamis.
5. Tim menguji perubahan admin terlihat di mobile setelah reload: promo, foto, kategori, FAQ, serta penugasan/status pesanan.
