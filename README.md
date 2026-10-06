# CleanGo Backend

REST API CleanGo untuk customer dan admin. Runtime aktif menggunakan Express,
TypeScript, MariaDB/MySQL, `mysql2/promise`, raw SQL, JWT, dan bcrypt.

## Requirement

- Node.js 20+
- MariaDB 10.6+ atau MySQL 8+
- npm

## Setup dari nol

1. Jalankan MySQL/MariaDB dari FlyEnv.
2. Import `database.sql` menggunakan database manager FlyEnv atau MySQL client.
3. Salin `.env.example` menjadi `.env`, lalu sesuaikan kredensial database.
4. Install dan jalankan aplikasi:

```powershell
npm install
npm run dev
```

API berjalan pada `http://127.0.0.1:3001` dan health check tersedia di
`GET /health`.

Build produksi:

```powershell
npm run build
npm start
```

## Environment

```dotenv
PORT=3001
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=cleango
FRONTEND_ORIGIN=http://localhost:3000
JWT_SECRET=change_this_secret
```

Jangan commit `.env`. Gunakan secret JWT yang panjang dan acak di luar lokal.

## Struktur runtime

```text
server.ts
database.sql
src/
  app.ts
  config/env.ts
  lib/                 pool, logger, JWT, AppError
  middleware/          auth, admin, 404, error
  model/               satu-satunya lokasi SQL
  controller/customer/ validasi dan response customer
  controller/admin/    validasi dan response admin
  routes/customer/     mapping endpoint customer
  routes/admin/        mapping endpoint admin
  types/
docs/
```

Alur wajib aplikasi adalah `Route → Controller → Model → MySQL`.

## Endpoint yang sudah aktif

Customer/public:

- `POST /api/customer/auth/register`
- `POST /api/customer/auth/login`
- `GET /api/customer/auth/me`
- `GET /api/customer/categories`
- `GET /api/customer/categories/:id`
- `GET /api/customer/services?search=&category=`
- `GET /api/customer/services/:id`

Admin:

- `POST /api/admin/auth/login`
- `GET /api/admin/auth/me`
- CRUD `/api/admin/categories`
- CRUD `/api/admin/services`

Endpoint admin selain login membutuhkan header `Authorization: Bearer <token>`.

## Membuat admin lokal

Register dahulu melalui endpoint customer agar password otomatis di-hash.
Kemudian ubah role user tersebut dari database manager lokal:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@cleango.local';
```

Setelah itu gunakan endpoint login admin dengan email dan password yang sama.
Role dari request body tidak pernah dipercaya.

## Contoh membuat service

```http
POST /api/admin/services
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "categoryId": 1,
  "name": "Premium Home Cleaning",
  "description": "Pembersihan rumah menyeluruh",
  "price": 200000,
  "durationMinutes": 180,
  "imageUrl": null,
  "isActive": true
}
```

Response sukses menggunakan status `201`; validasi gagal `400`; token tidak
valid `401`; bukan admin `403`; data tidak ditemukan `404`; dan error internal
`500`.

Kontrak rinci tersedia di `docs/API.md`. Keputusan refactor dan batas fase ada
di `docs/REFACTOR_ANALYSIS.md`.
