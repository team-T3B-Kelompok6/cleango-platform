# CleanGo Backend

Backend Supabase/PostgreSQL untuk aplikasi customer, dashboard admin, dan fitur
AI CleanGo. Repository ini tidak berisi UI Flutter, Web, atau Next.js.

## Status

Fase 1–9 sudah diimplementasikan:

- analisis requirement, arsitektur, dan ERD;
- 20 tabel normalized (19 tabel domain + counter privat);
- constraints, indexes, trigger profile Supabase Auth, RLS, dan policies;
- RPC `create_booking` dengan perhitungan harga/promo server-side;
- RPC `assign_cleaner` dengan proteksi bentrok jadwal memakai `tstzrange` dan
  `EXCLUDE USING gist`;
- smoke test transaksi dan validasi migration dari database kosong.
- REST API Express.js + TypeScript dengan alur
  `route -> middleware -> controller -> service -> repository -> Supabase`;
- Auth, katalog kategori/service, alamat customer, dan booking customer;
- validasi Zod, Bearer-token verification, Helmet, CORS, rate limit, error
  envelope konsisten, TypeScript strict, build, dan HTTP smoke tests.

Fase 10–20 (status transition, Realtime, payment, review, support, location,
ETA/risk, reporting, chatbot, seed lengkap, dan test suite penuh) tercatat di
[docs/API.md](docs/API.md) dan belum diklaim selesai.

## Struktur

```text
src/
  config/ controllers/ middlewares/ repositories/
  routes/ services/ types/ utils/ validators/
tests/
docs/
  API.md
  DATABASE.md
  architecture.md
  erd.md
  requirements-analysis.md
  security.md
scripts/
  setup-flyenv.ps1
supabase/
  local/000_flyenv_bootstrap.sql
  migrations/001_...sql sampai 018_...sql
  seed.sql
  tests/phase_1_9_smoke.sql
```

## Requirements

- Node.js 20+
- PostgreSQL 15+ atau Supabase lokal/cloud
- Supabase CLI untuk local stack Supabase
- `psql` untuk menjalankan smoke test langsung

## Menjalankan REST API

Salin `.env.example` menjadi `.env`, lalu isi URL dan key project Supabase.
`SUPABASE_SECRET_KEY` (atau legacy `SUPABASE_SERVICE_ROLE_KEY`) wajib tetap
berada di backend dan tidak boleh masuk ke aplikasi mobile/web.

```powershell
npm install
npm run dev
```

API tersedia di `http://127.0.0.1:3000`, health check di `/health`, dan seluruh
resource API memakai prefix `/api/v1`.

Endpoint fase 2–9:

- `POST /api/v1/auth/register`, `/login`, `/forgot-password`, `/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/categories`
- `GET /api/v1/services`, `/api/v1/services/:id`
- `GET|POST /api/v1/addresses`
- `GET|PATCH|DELETE /api/v1/addresses/:id`
- `GET|POST /api/v1/bookings`
- `GET /api/v1/bookings/active`
- `GET /api/v1/bookings/:id`
- `POST /api/v1/bookings/:id/cancel`

Verifikasi proyek:

```powershell
npm run typecheck
npm run build
npm test
```

FlyEnv PostgreSQL biasa tidak menyediakan Supabase Auth/PostgREST. Database
FlyEnv tetap berguna untuk migration dan SQL smoke test, sedangkan endpoint
REST ini membutuhkan project Supabase lokal penuh atau Supabase Cloud agar
Auth dan Data API tersedia.

## Supabase lokal

```bash
supabase init
supabase start
supabase db reset
```

Migration pada `supabase/migrations` diterapkan berurutan oleh reset. Jangan
menjalankan migration secara acak. Untuk menguji RPC setelah reset:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase_1_9_smoke.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql
```

`phase_1_9_smoke.sql` memakai compatibility table `auth.users` milik FlyEnv.
Pada stack Supabase penuh, buat user test lewat Supabase Auth atau test harness.

## PostgreSQL FlyEnv

Untuk database lokal FlyEnv yang kosong:

```powershell
.\scripts\setup-flyenv.ps1
```

Script membuat database `cleango`, memasang compatibility object lokal, lalu
menjalankan seluruh migration. Bootstrap di `supabase/local` **jangan**
dideploy ke Supabase Cloud karena Auth dan API roles sudah disediakan Supabase.

Database yang sudah ada dapat diperbarui dengan menjalankan migration baru
secara berurutan memakai `psql -v ON_ERROR_STOP=1`.

## Supabase Cloud

1. Buat project dan login melalui Supabase CLI.
2. Hubungkan repository: `supabase link --project-ref <project-ref>`.
3. Tinjau diff: `supabase db diff`.
4. Terapkan migration: `supabase db push`.
5. Isi environment server dari `.env.example`; jangan commit secret.

`SUPABASE_SERVICE_ROLE_KEY` dan `AI_API_KEY` hanya boleh berada pada backend
tepercaya/Edge Function, tidak pada aplikasi mobile atau web.

## Endpoint lokal

- pgAdmin FlyEnv: [http://127.0.0.1:5050/browser/](http://127.0.0.1:5050/browser/)
- PostgreSQL: `127.0.0.1:5432`, database `cleango`

Detail schema dan kontrak RPC tersedia di [docs/DATABASE.md](docs/DATABASE.md)
dan [docs/API.md](docs/API.md).
