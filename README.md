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

Fase 10–20 (status transition, Realtime, payment, review, support, location,
ETA/risk, reporting, chatbot, seed lengkap, dan test suite penuh) tercatat di
[docs/API.md](docs/API.md) dan belum diklaim selesai.

## Struktur

```text
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
  migrations/001_...sql sampai 017_...sql
  tests/phase_1_9_smoke.sql
```

## Requirements

- PostgreSQL 15+ atau Supabase lokal/cloud
- Supabase CLI untuk local stack Supabase
- `psql` untuk menjalankan smoke test langsung

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
