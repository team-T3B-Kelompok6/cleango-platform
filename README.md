# CleanGo

Web admin untuk mengelola layanan dan kegiatan operasional CleanGo.

## Alur penggunaan

1. Login sebagai admin, lalu lihat ringkasan pesanan di dashboard.
2. Siapkan layanan, kategori, harga, dan promo melalui **Kelola Layanan**.
3. Lengkapi data petugas dan atur shift melalui **Kelola Jadwal**.
4. Buka pesanan yang masuk, periksa detailnya, lalu tentukan petugas yang tersedia.
5. Gunakan **Pantau Petugas** untuk membuka tugas cleaner dan melihat progres pekerjaan.
6. Kelola informasi customer dan pertanyaan pelanggan melalui menu **Customer** dan **FAQ**.
7. Buka **Laporan** untuk melihat ringkasan pekerjaan dan mengunduh CSV.
8. Periksa aktivitas serta perubahan data melalui **Audit Log Admin**.
9. Pilih **Keluar akun** setelah selesai.

Alur tiap menu dijelaskan di [README frontend](frontend/README.md).

## Instalasi

```powershell
npm install
if (-not (Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
if (-not (Test-Path frontend/.env.local)) { Copy-Item frontend/.env.example frontend/.env.local }
```

Jalankan aplikasi pada terminal terpisah:

```powershell
npm run dev:backend
npm run dev:frontend
```

- Backend: mengikuti `PORT` di `backend/.env` (template tim: `3101`).
- Health check: `GET http://127.0.0.1:3101/health` (sesuaikan port lokal).
- Frontend: `http://localhost:3000`

`frontend/.env.local` harus memakai `API_URL=http://127.0.0.1:<PORT>/api` sesuai
backend yang berjalan. Flutter HP memakai IP LAN laptop melalui
`--dart-define=API_URL=http://<IP_LAPTOP>:<PORT>/api`; bukan localhost HP.
Konfigurasi lokal yang sudah ada tidak ditimpa oleh merge.

## Database backend

1. Jalankan MySQL/MariaDB, misalnya melalui Laragon.
2. Sesuaikan kredensial pada `backend/.env`.
3. Database baru/demo: jalankan `npm run db:setup` (termasuk seeder). Untuk database lokal `cleango` yang sudah berisi data, gunakan `npm run db:setup --workspace backend -- --schema-only` agar hanya struktur Putra yang diperbarui, tanpa menimpa data lama.

Akun admin dummy lokal: `admin@cleango.id` / `321321`. Password tersimpan
sebagai hash bcrypt di database, bukan teks biasa.

Jangan commit file `.env`. Gunakan nilai `JWT_SECRET` yang panjang dan acak di
luar lingkungan lokal.

## Struktur

```text
backend/
  server.ts
  database.sql
  src/
    app.ts
    config/
    controller/
    lib/
    middleware/
    model/
    routes/
    types/
  docs/
  tests/
frontend/
  app/
  components/
  lib/
  public/
  types/
```

Backend mengikuti alur `Route → Controller → Model → MySQL`.

## Endpoint backend

Customer/public:

- `POST /api/customer/auth/register`
- `POST /api/customer/auth/login`
- `GET /api/customer/auth/me`
- `GET /api/customer/categories`
- `GET /api/customer/categories/:id`
- `GET /api/customer/services?search=&category=`
- `GET /api/customer/services/:id`
- `POST /api/customer/chat` — CS AI Boo: panduan, kendala, keluhan, FAQ, katalog, promo; JWT customer diperlukan untuk pesanan pribadi.

Admin:

- `POST /api/auth/login` (kontrak login frontend admin)
- `POST /api/admin/auth/login`
- `GET /api/admin/auth/me`
- CRUD `/api/admin/categories`
- CRUD `/api/admin/services`
- CRUD `/api/services` (kontrak web admin terbaru)
- CRUD `/api/faqs`
- CRUD `/api/staff`
- `POST /api/tracking/eta` — hasil algoritma rute OSRM, tanpa model ML.
- `POST /api/tracking/risk` — risiko operasional dari jadwal, ETA, keberangkatan, dan umur GPS.
- `POST /api/tracking/work-duration` — waktu mulai + durasi layanan/SOP, tanpa regresi.

Endpoint admin selain login membutuhkan header `Authorization: Bearer <token>`.
Kontrak API selengkapnya tersedia di `backend/docs/API.md`.

## CS AI dan estimasi tanpa ML

Boo menjadi **Customer Service AI** melalui Groq untuk informasi dan kendala pelanggan.
Harga/promo/kebijakan bisnis mengikuti sumber database resmi; pesanan pribadi hanya
dapat dibaca setelah validasi akun dan kepemilikan. CS tidak membuat tiket atau
mengubah pembayaran/status lewat chat. Jawaban aman tetap tersedia jika provider gagal.

Perjalanan memakai routing OSRM. Risiko membandingkan waktu yang tersisa menuju
jadwal dengan durasi rute, disertai pemeriksaan keberangkatan dan kesegaran GPS.
Pengerjaan memakai **waktu mulai aktual + durasi layanan**. Tidak ada pelatihan,
Joblib, server Flask, pengali harga berdasarkan foto, atau probabilitas ML dalam alur aktif.
Status selesai tetap dikonfirmasi cleaner, bukan otomatis karena estimasi habis.

Jalankan backend dan frontend seperti biasa; **tidak perlu menyalakan Python**.
Kode Python/Flask dan notebook pemanggil ML lama sudah dihapus; tersedia di riwayat Git.
Dataset, artefak model, metrik, dan dokumentasi eksperimen tetap disimpan sebagai arsip,
tidak dipakai runtime.
Penjelasan lengkap: [CS AI dan algoritma](ai/docs/CS_AI_DAN_ALGORITMA.md).

## Verifikasi backend

Chatbot Groq tidak memerlukan training atau layanan Python. Konfigurasi, alur,
cara menjalankan Flutter, hasil uji dan pending integrasi ada di
[AI-04](ai/docs/AI-04.md).
Secara default chatbot memakai pengetahuan umum tanpa database
(`CHATBOT_DATABASE_ENABLED=false`); harga/promo live dan pesanan pribadi masih pending.
Uji mode ini dengan `npm run chat:check --workspace backend -- --knowledge`.
Konfigurasi lokal saat ini sudah diaktifkan atas permintaan pengguna dengan
`CHATBOT_DATABASE_ENABLED=true` pada `backend/.env`: knowledge dan database baca
dipakai bersama. Uji dengan `npm run chat:check --workspace backend -- --database`.
Restart backend setelah mengubah flag; pesanan pribadi tetap memerlukan JWT customer.

```powershell
npm run typecheck:backend
npm run test:backend
npm run build:backend
```
## Mode demo tanpa backend

Untuk mencoba tanpa backend, gunakan mode demo dengan akun `admin` / `admin`. Data demo bukan data dari server backend.
