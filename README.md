# CleanGo Platform

Pemeriksaan frontend terbaru: [checklist 17–18 Oktober 2026](frontend/docs/checklist-review-2026-10-17/README.md). Pengujian memakai demo dan fixture HTTP lokal; API tim belum diterima pemilik frontend sehingga integrasi produksi belum dinyatakan selesai. Jalankan frontend dari folder `frontend` sesuai [panduannya](frontend/README.md).

Monorepo CleanGo untuk backend Express + TypeScript dan frontend Next.js.

## Prasyarat

- Node.js 20+
- npm
- MySQL 8+ atau MariaDB 10.6+

## Instalasi

```powershell
npm install
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

Jalankan aplikasi pada terminal terpisah:

```powershell
npm run dev:backend
npm run dev:frontend
```

- Backend: `http://127.0.0.1:3001`
- Health check: `GET http://127.0.0.1:3001/health`
- Frontend: `http://localhost:3000`

## Database backend

1. Jalankan MySQL/MariaDB dari FlyEnv.
2. Jalankan `npm run db:setup --workspace backend` atau import `backend/database.sql` melalui phpMyAdmin.
3. Sesuaikan kredensial pada `backend/.env`.

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

Admin:

- `POST /api/auth/login` (kontrak login frontend admin)
- `POST /api/admin/auth/login`
- `GET /api/admin/auth/me`
- CRUD `/api/admin/categories`
- CRUD `/api/admin/services`
- CRUD `/api/services` (kontrak web admin terbaru)
- CRUD `/api/faqs`
- CRUD `/api/staff`

Endpoint admin selain login membutuhkan header `Authorization: Bearer <token>`.
Kontrak API selengkapnya tersedia di `backend/docs/API.md`.

## Verifikasi backend

```powershell
npm run typecheck --workspace backend
npm test --workspace backend
npm run build --workspace backend
```
