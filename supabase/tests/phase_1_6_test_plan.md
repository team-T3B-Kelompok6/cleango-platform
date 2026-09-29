# Test Plan Fase 1–6 (arsip)

Dokumen ini dipertahankan sebagai riwayat fase awal. Test aktif dan coverage
terbaru berada di `phase_1_9_test_plan.md` dan `phase_1_9_smoke.sql`.

Jalankan setelah `supabase start && supabase db reset`.

## Schema dan constraints

- Pastikan seluruh 13 tabel menggunakan UUID primary key.
- Insert service dengan harga negatif harus gagal.
- Insert review dengan rating 0 atau 6 harus gagal.
- Insert dua default address untuk user yang sama harus gagal.
- Insert dua schedule `scheduled` cleaner yang overlap harus gagal dengan
  exclusion violation; slot yang tepat bersebelahan harus berhasil.
- Insert booking dengan total yang tidak sama dengan subtotal + additional fee
  harus gagal.

## Auth trigger

- Register user dengan metadata `{ full_name, role: "admin" }`.
- Pastikan profile otomatis dibuat dan role tetap `customer`.
- Register customer normal dan pastikan hanya satu profile dibuat.
- Pastikan kegagalan trigger terlihat sebagai kegagalan signup, bukan profile
  yang diam-diam hilang.

## RLS customer A vs customer B

- A dapat SELECT/UPDATE profile A, tetapi tidak profile B.
- A tidak dapat mengubah kolom `role`, `id`, `created_at`, atau `updated_at`.
- A dapat CRUD address A dan tidak dapat melihat/mengubah address B.
- A hanya melihat category/service/cleaner aktif.
- A hanya melihat booking, history, payment, review, dan notification A.
- A tidak dapat INSERT/UPDATE booking secara langsung.
- A hanya dapat mengubah `notifications.is_read` miliknya.
- A dapat CRUD conversation A dan tidak conversation B.
- A hanya dapat memasukkan AI message dengan role `user` ke conversation A.

## Admin

- Setelah role dinaikkan melalui SQL/service-role, admin dapat melihat seluruh
  resource melalui policy admin.
- Mutation data sensitif tetap dilakukan via backend tepercaya/RPC fase 7;
  pastikan direct mutation tanpa grant ditolak.

## Anon

- Semua SELECT/INSERT/UPDATE/DELETE tabel aplikasi harus ditolak untuk `anon`.

