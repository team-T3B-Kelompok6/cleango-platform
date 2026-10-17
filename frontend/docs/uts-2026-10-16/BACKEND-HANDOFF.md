# Handoff frontend ke backend

Backend belum selesai menurut konfirmasi pengguna. Paket ini menyiapkan frontend dan kontraknya, bukan mengubah Express/database/Flutter. Referensi backend yang dibaca adalah `origin/main` commit `192c4d9`; jangan menganggap daftar ini menggambarkan revisi backend yang belum dipush teman.

Sumber kontrak utama: [API-CONTRACT.md](../API-CONTRACT.md), `types/index.ts`, `types/cleaner.ts`, `types/promos.ts`. Semua endpoint admin perlu autentikasi dan validasi peran di server. Jangan menggunakan fixture `scripts/uts-qa-api.mjs` sebagai backend produksi.

## Prioritas integrasi

| Area | Yang frontend perlukan | Kondisi source main yang diperiksa / tindakan tim |
| --- | --- | --- |
| Auth | `POST /auth/login`, accessToken, profil/admin role; Bearer pada request data. | Route login tersedia. Uji cookie/token expiry dan error fields bersama frontend. |
| Orders | `GET /orders`, `GET/PATCH/DELETE /orders/:id`; penugasan di `staff`, status, jadwal, catatan, harga, kontak customer. | Router order baru memiliki GET list/detail. Tambahkan mutasi dan rekonsiliasi jadwal/petugas. Tidak perlu create order dari admin. |
| Schedules | `GET /schedules`, `GET/PATCH/DELETE /schedules/:id`. | Route ini belum terlihat di router platform. Jadwal berasal dari order; jangan membuat salinan order yang tidak sinkron. |
| Services | CRUD `/services`, `imageUrl`, `discountPrice`, `features`, kategori dinamis, active. | CRUD dasar tersedia, tetapi parser input main belum menyimpan foto/harga promo dan kategori masih enum. Selaraskan DTO/model/validasi. |
| Staff | CRUD `/staff`, `skills: string[]`, kesiapan dan data detail opsional. | Main masih mewajibkan `area`; form terbaru memakai keahlian. Jangan hanya mengubah label wilayah menjadi skills tanpa model yang sesuai. |
| Customers | CRUD `/customers` (tambah manual opsional), kontak/alamat/status, summary opsional. | `/customer` di main adalah prefix app customer, bukan resource admin `/customers`. Buat atau sepakati mapping yang tepat. |
| FAQ | CRUD `/faqs`, category/published; metadata opsional hanya jika ada sumber. | CRUD dasar ada; kategori/metadata perlu dicocokkan. Prioritas/urutan Figma belum mempunyai UI/kontrak final. |
| Upload | `POST /uploads` multipart `file`, `{data:{url}}`; gambar JPG/PNG dan akses URL. | Endpoint platform belum terlihat. Simpan file/object storage, validasi MIME/ukuran dan URL akses. |
| Categories | `GET /categories?resource=services|faqs`, `POST /categories`. | Ada `/admin/categories` untuk taxonomy lain. Samakan path dan scope; jangan menganggapnya identik otomatis. |
| Banner | `/banners` sesuai kontrak, gambar untuk home mobile. | Route platform belum terlihat. UI admin baru mempunyai tambah banner; pengelolaan banner lama masih gap UI. |
| Promo | `/promos` CRUD, persen/nominal, cakupan semua/beberapa ID layanan, periode, kuota, min/max. | Route platform belum terlihat. Validasi dan pemakaian kuota harus atomik di backend; mobile checkout perlu memakai record yang sama. |
| Cleaner | Admin dispatch/list, token task, transisi, foto, report, status dan retry. | Belum terlihat pada main. Ikuti bagian [tugas cleaner](../API-CONTRACT.md#halaman-tugas-cleaner-dan-dispatch). Pisahkan persistensi pekerjaan dari delivery. |
| Reports | Frontend menghitung data order tersedia dan ekspor CSV. | Butuh sumber paid status/payment snapshot sebelum disebut pendapatan lunas. PDF/XLSX dan invoice rinci belum selesai. |

## Aturan data penting

- Response list `{data: [...]}` dan detail `{data: record}`. ID dikirim sebagai string; ID detail harus sama dengan ID yang diminta. Error `{message, errors?}` dengan status HTTP yang benar.
- `staff` order merupakan array nama pada kontrak lama. Untuk relasi ID yang lebih kuat, sepakati migrasi DTO bersama; jangan hanya mengirim objek/ID numerik ke field lama.
- Admin/cleaner/customer app harus membaca order yang sama. Satu sumber layanan menentukan foto, fasilitas dan harga efektif pada daftar, detail dan checkout.
- Shift tampilan disepakati 08–12 / 13–17 / 18–21 WIB. Kuota/roster berbeda dari jadwal booking; jangan memetakan cuti ke penghapusan pesanan.
- Penugasan harus tersimpan sebelum dispatch diminta. Gagal WhatsApp tidak membatalkan penugasan. Penyelesaian harus menyimpan report/waktu terlebih dahulu; gagal delivery tidak menghapusnya.
- `sent` hanya dari acknowledgment provider yang sah; `simulated` dan `manual_ready` tetap berbeda. Membuka `wa.me` tidak membuktikan pesan terkirim. Report ditujukan ke customer order, link penugasan ke petugas.
- Token tugas dibatasi satu assignment, kedaluwarsa dan dicabut saat reassignment/batal. Validasi akses foto dan transisi idempotent di server; jangan mengekspos list admin lewat link publik.
- Isi dummy tetap diberi label [UJI], kontak tidak aktif, dan pengiriman simulasi. Dataset uji produksi harus mempunyai pemisahan yang eksplisit.

## Prosedur uji bersama

1. Ambil revisi frontend dan backend yang disepakati, gunakan database uji serta provider sandbox.
2. Isi `API_URL`, matikan **kedua** flag demo (`ADMIN_DEMO_ENABLED=false`, `CLEANER_DEMO_ENABLED=false`), restart frontend, dan login akun backend.
3. Ulangi [matriks tes](TEST-PLAN.md) sambil melihat log API/database. Cocokkan GET setelah POST/PATCH/DELETE, jangan hanya toast di browser.
4. Uji akses tanpa token, role salah, token expired, payload salah, ID tidak ada, downtime dan pemulihan.
5. Uji assignment → dispatch → link HP → depart → tiba → report → delivery; verifikasi penerima dan status provider.
6. Buka aplikasi customer dan pastikan data yang sama berubah. Rekam commit frontend/backend dan bukti baru sebelum menandai checklist API selesai.

Repo untuk handoff: [cleango-platform](https://github.com/team-T3B-Kelompok6/cleango-platform). Rekomendasi pesan commit frontend: `feat(frontend): finalize admin demo workflow and UTS verification`. Lakukan review perubahan frontend/root README sebelum push; environment, store lokal, token tugas dan file private build tidak ikut Git.
