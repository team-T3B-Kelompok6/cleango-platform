# Analisis Kebutuhan Backend (Fase 1)

## Aktor dan trust boundary

- **Customer** adalah user Supabase Auth yang role database-nya `customer`.
- **Admin** adalah user yang dipromosikan oleh backend/operator tepercaya.
- **Frontend** selalu dianggap tidak tepercaya: `user_id`, role, harga, status,
  cleaner, serta payment state dari request tidak boleh dijadikan sumber benar.
- **Service role** hanya hidup pada environment server-side dan bukan mekanisme
  authorization yang boleh tersedia pada mobile/browser.

## Aggregate dan invariant utama

### Identity

- Satu `auth.users` tepat satu `profiles`.
- Signup tidak pernah dapat memilih role admin.
- Profile user dibuat atomik oleh trigger setelah insert auth user.

### Booking

- Booking dimiliki caller terautentikasi.
- Address harus milik customer booking.
- Harga dan durasi berasal dari service aktif di database.
- `total_price = subtotal + additional_fee - discount_amount` dijaga constraint.
- Status awal adalah `pending`; setiap perubahan status wajib memiliki history.
- Booking code unik dan race-safe dibuat oleh RPC `create_booking`.

### Assignment dan schedule

- Cleaner harus aktif untuk menerima assignment.
- Satu booking hanya memiliki satu schedule aktif.
- Slot cleaner `scheduled` tidak boleh overlap; exclusion constraint sudah
  menjadi perlindungan terakhir di level database.
- Assignment, schedule, status, history, dan notification harus satu transaksi.

### Payment dan review

- Payment bersifat manual/mock pada tahap awal.
- Hanya booking `completed` dapat direview oleh pemilik booking.
- Satu booking maksimal satu review dan rating harus 1-5.
- Validasi lintas tabel review akan dijalankan RPC, bukan dipercaya dari client.

### AI

- Conversation dan message terisolasi per `auth.uid()`.
- Client hanya boleh menulis message dengan role `user`.
- Message `assistant/system` hanya dibuat backend AI setelah JWT diverifikasi.

## Non-functional requirements

- Migration dapat direproduksi dan memiliki urutan dependency eksplisit.
- Semua tabel public mempunyai RLS dan explicit grants.
- Index mengikuti foreign key, ownership lookup, admin queue, dan unread feed.
- Semua operasi multi-row kritis harus transactional.
- Error bisnis fase berikutnya memakai kode stabil seperti
  `AUTH_REQUIRED`, `FORBIDDEN`, `INVALID_STATUS_TRANSITION`, dan
  `CLEANER_SCHEDULE_CONFLICT`.

## Risiko yang ditutup pada Fase 1-9

| Risiko | Mitigasi |
|---|---|
| Customer menaikkan role | role default customer, metadata role diabaikan, tidak ada update grant pada role |
| BOLA/IDOR | ownership predicate memakai `auth.uid()` pada setiap policy user data |
| Data API terlalu luas | revoke dahulu, lalu grant operasi/kolom minimum |
| Recursive admin policy | helper `private.is_admin()` yang diaudit dan non-exposed |
| Double default address | partial unique index |
| Double review | unique constraint pada `reviews.booking_id` |
| Schedule overlap | GiST exclusion constraint pada cleaner dan `tstzrange` |
| Price/promo tampering | Harga, promo, dan total hanya dihitung `create_booking` |
| Assignment bukan admin | `assign_cleaner` memverifikasi `private.is_admin()` |
| Nilai uang invalid | numeric checks dan total consistency constraint |

## Deferred secara sengaja

State-machine status, cross-table review validation, notification mapping penuh,
Realtime publication, reporting, seed lengkap, dan test integrasi penuh masuk
Fase 10–20. Direct mutation sensitif tetap tertutup sampai RPC tersebut ada.

