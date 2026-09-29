# Security Model dan Strategi RLS

## Prinsip

- Identity selalu berasal dari `auth.uid()`/JWT, bukan body request.
- Role authorization berasal dari `profiles.role`; metadata user tidak dipakai.
- `anon` tidak mendapat privilege tabel aplikasi.
- `authenticated` hanya mendapat operasi yang memang tersedia bagi aplikasi.
- `service_role` hanya untuk server tepercaya dan tidak boleh masuk frontend.
- Tabel transaksi memakai foreign key, enum/check, unique, dan not-null constraint.

## Matrix akses

| Resource | Customer | Admin |
|---|---|---|
| profiles | read/update profile sendiri | read semua; perubahan role via backend tepercaya |
| addresses | CRUD milik sendiri | read semua |
| categories/services/inclusions | read yang aktif | CRUD melalui RLS admin |
| cleaners | read cleaner aktif | CRUD melalui RLS admin |
| bookings | read milik sendiri; create via RPC | read semua; mutation via RPC |
| status history | read history booking sendiri | read semua |
| schedules | tidak ada direct access | read semua; mutation via RPC |
| payments | read payment booking sendiri | read semua; mutation via backend/RPC |
| reviews | read milik sendiri; create via RPC fase 13 | read semua |
| notifications | read/update `is_read` milik sendiri | read semua; create via RPC |
| promo | read promo usable dan usage sendiri | CRUD promo; read usage |
| cleaner location | booking aktif milik sendiri | read semua |
| support/ETA | booking milik sendiri | read semua |
| risk prediction | tidak ada akses | read semua |
| AI conversation | CRUD conversation sendiri | read semua untuk support/audit |
| AI messages | read/delete sendiri; insert role `user` | read semua |

## Pencegahan privilege escalation

Client hanya diberi column-level update pada `profiles(full_name, phone,
avatar_url)`. Kolom `role` tidak memiliki grant update. Admin baru hanya dapat
ditetapkan melalui SQL Dashboard atau service role server-side yang tepercaya.

## Helper privileged

`private.is_admin()`, `create_booking`, dan `assign_cleaner` memakai
`SECURITY DEFINER` hanya saat perlu melewati direct write yang sengaja ditutup.
Function mengunci `search_path`, schema-qualify identifier, memeriksa identity
dan authorization, serta mencabut `EXECUTE` dari `PUBLIC`/`anon`.

## Catatan operasi sensitif

Tidak ada direct grant untuk membuat/mengubah booking, assignment, status,
schedule, payment, promo usage, history, dan review. `create_booking` dan
`assign_cleaner` sudah membuka dua jalur atomik yang tervalidasi; sisanya tetap
tertutup sampai business rule fase berikutnya selesai.

