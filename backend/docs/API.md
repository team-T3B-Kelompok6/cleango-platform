# CleanGo REST API

Base URL lokal: `http://127.0.0.1:3001`.

Error JSON: `{ "message": "Pesan error", "code": "APP_ERROR" }`.

## Authentication

- `POST /api/auth/login` — kontrak login frontend admin (`username`, `password`, `remember`)
- `POST /api/customer/auth/register`
- `POST /api/customer/auth/login`
- `GET /api/customer/auth/me` — Bearer token
- `POST /api/admin/auth/login`
- `GET /api/admin/auth/me` — Bearer token admin

Akun dummy lokal dari `database.sql`: `admin@cleango.id` / `321321`.
Password disimpan sebagai hash bcrypt.

## Customer catalog

- `GET /api/customer/categories`
- `GET /api/customer/categories/:id`
- `GET /api/customer/services?search=&category=`
- `GET /api/customer/services/:id`

Hanya data aktif yang dikembalikan.

## Admin categories

- `GET /api/admin/categories`
- `GET /api/admin/categories/:id`
- `POST /api/admin/categories`
- `PATCH /api/admin/categories/:id`
- `DELETE /api/admin/categories/:id`

## Admin services

- `GET /api/admin/services?search=&category=`
- `GET /api/admin/services/:id`
- `POST /api/admin/services`
- `PATCH /api/admin/services/:id`
- `DELETE /api/admin/services/:id`

Admin endpoint membutuhkan Bearer token dengan role admin. Controller
memvalidasi nama, harga `>= 0`, durasi `> 0`, kategori, ID, query, dan boolean.
Semua SQL hanya berada pada model dan memakai placeholder `?`.
