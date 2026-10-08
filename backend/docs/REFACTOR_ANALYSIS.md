# Refactor Analysis — Supabase/PostgreSQL ke MySQL

Audit dilakukan pada branch `Putra` tanpa mengganti branch, commit, atau push.
Remote bernama `CleanGo-backend` dan tidak memiliki folder `frontend/`; root
repository diperlakukan sebagai folder backend agar tidak membuat nesting
buatan atau memindahkan pekerjaan anggota lain.

## Current state

- Express 5 dan TypeScript strict sudah tersedia.
- Arsitektur lama: mobile/admin → controller → service → repository → Supabase.
- Database lama: migration PostgreSQL/Supabase, RLS, RPC, dan Supabase Auth.
- Business rule yang dipakai ulang: identity dari token, harga dari database,
  transaksi booking/assignment, dan pemisahan customer/admin.
- Worktree telah memiliki perubahan sebelum refactor; file pgAdmin tidak disentuh.

## KEEP

- Express, TypeScript strict, pola error terpusat, dan ide response.
- Business rules booking, address ownership, status history, cleaner schedule.
- Pemisahan customer/admin dan dokumentasi lama sebagai jejak keputusan.

## MODIFY

- Package, TypeScript, env, README, app/server, router dan middleware.
- Prefix menjadi `/api/customer` dan `/api/admin`.
- Identity menjadi JWT + bcrypt dan database menjadi MySQL raw SQL.

## REMOVED AFTER VERIFICATION

- `src/config/supabase.ts`, `src/mobile`, `src/modules`, `src/admin` lama.
- `supabase/` migrations/tests/seed serta dokumentasi khusus PostgreSQL/RLS.
- Router `/api/v1`, script setup PostgreSQL/pgAdmin, dan helper lama.
- Seluruh target diperiksa lebih dahulu dan tidak memiliki import dari runtime,
  build, atau test MySQL sebelum dihapus.

## NEW

- `database.sql`, `src/lib/db.ts`, `src/model`.
- Controller dan route customer/admin sesuai rubric.

## Delivery phases

1. **Selesai:** setup, pool MySQL, schema, middleware order, Categories,
   Services CRUD, dan auth customer/admin dasar.
2. Berikutnya: profile, address, booking transaction, admin orders/status.
3. Berikutnya: cleaners/schedule, reviews, notifications, support, reports.
4. Terakhir: test integrasi penuh untuk seluruh fitur lanjutan.
