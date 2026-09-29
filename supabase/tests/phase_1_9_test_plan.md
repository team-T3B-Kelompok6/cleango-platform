# Test Plan Fase 1–9

## Otomatis

Jalankan `phase_1_9_smoke.sql` pada database development. Test dibungkus
transaction dan selalu `ROLLBACK`, sehingga fixture tidak tersimpan.

Coverage saat ini:

- trigger signup membuat profile customer;
- `create_booking` menghitung harga, diskon, total, schedule, code, dan history;
- `assign_cleaner` membuat assignment, schedule, history, dan notification;
- overlap schedule ditolak;
- customer B tidak dapat melihat booking, address, atau notification customer A;
- customer tidak dapat menaikkan role sendiri.

## Audit schema

- Terapkan bootstrap FlyEnv dan migration 001–017 pada database kosong.
- Pastikan seluruh 20 tabel `public` memiliki `relrowsecurity = true`.
- Pastikan `authenticated` tidak mempunyai direct insert/update/delete pada
  `bookings` dan tidak mempunyai update privilege pada `profiles.role`.
- Pastikan `PUBLIC` dan `anon` tidak mempunyai execute privilege pada RPC.
- Pastikan setiap `SECURITY DEFINER` mempunyai `search_path` eksplisit.
- Pastikan semua kolom foreign key mempunyai supporting index.

## Manual Supabase Auth/Data API

- Register dengan metadata role `admin`; profile harus tetap `customer`.
- Login/logout/reset password menggunakan SDK Supabase.
- Panggil dua RPC melalui JWT customer/admin dan cocokkan error code.
- Pastikan anon tidak dapat membaca tabel aplikasi.

## Deferred

Test status transition, Realtime, payment, review, support, location, ETA/risk,
reporting, dan AI mengikuti implementasi Fase 10–20.
