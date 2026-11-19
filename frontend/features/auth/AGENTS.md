# Aturan `features/auth/`

Pilot struktur fitur. Alur: form login → Server Action → Express → cookie HTTP-only.

## Isi

| Berkas                       | Lapisan | Isi                                                                 |
| ---------------------------- | ------- | ------------------------------------------------------------------- |
| `data/authTypes.ts`          | data    | `LoginField`, `LoginCredentials`, `LoginFormValues`, `LoginSession` |
| `data/authConstants.ts`      | data    | `LOGIN_FIELDS`, `LOGIN_COPY` (semua teks)                           |
| `data/authValidation.ts`     | data    | `validateLoginForm()`, `isLoginSession()`                           |
| `api/authApi.ts`             | server  | `loginAdmin()` → `post<LoginSession>('/auth/login', …)` (anonim)    |
| `api/authActions.ts`         | server  | `loginAction()` (`'use server'`), memasang cookie sesi              |
| `hooks/useLoginForm.ts`      | client  | TanStack `useMutation` + `router.push('/')` + `refresh()`           |
| `components/LoginCard.tsx`   | markup  | kartu: logo, judul, deskripsi, children                             |
| `components/LoginFields.tsx` | markup  | field, checkbox "Ingat saya", pesan galat, tombol submit            |
| `components/LoginForm.tsx`   | markup  | perangkai hook + `LoginCard` + `LoginFields`                        |
| `components/LoginHelp.tsx`   | markup  | dialog bantuan; tombol logout memakai `@/lib/api/logoutAction`      |
| `pages/LoginPage.tsx`        | server  | membaca `hasSession()`/`adminDemoEnabled()`, memasang `AuthLayout`  |
| `index.ts`                   | barrel  | `LoginPage`, `LoginForm`, `LoginHelp`, `LOGIN_COPY`, tipe           |

## Aturan

1. **Satu sumber validasi.** `validateLoginForm()` dipakai action; jangan menyalin aturan
   "wajib diisi" ke komponen.
2. **Action tidak `redirect()`.** Navigasi milik hook. Konsekuensinya submit tanpa JavaScript
   tidak bekerja; `LoginFields` menampilkan `<noscript>` sebagai pemberitahuan — itu
   disengaja.
3. **Token tidak pernah ke client.** `loginAction` memanggil `saveSession()` dari
   `lib/api/session.ts`; `LoginSession.accessToken` tidak pernah dikirim sebagai props.
4. **`isLoginSession()` wajib.** Token dipakai sebagai cookie dan header `Bearer`; bentuk
   aneh dari upstream harus ditolak sebagai 502.
5. **Teks di `authConstants.ts`.** Jangan menulis string UI langsung di `.tsx`.
6. **`LoginHelp` menerima `demo`/`session`**, tidak mengambilnya sendiri.
7. **Jangan menambah field baru tanpa memperbarui semuanya**: `LoginFieldName`,
   `LOGIN_FIELDS`, `validateLoginForm`, dan backend `/api/auth/login`.
8. **Endpoint dipanggil lewat helper bertipe** `@/lib/api` (`post<LoginSession>(...)`), bukan
   `fetch`/`upstreamRequest` mentah. Helper mengembalikan `Promise<T>`, lalu
   `isLoginSession()` tetap memvalidasi bentuk runtime.

## Batas verifikasi

Login end-to-end (sukses, "ingat saya", sesi kedaluwarsa) hanya bisa dibuktikan dengan
backend + cookie nyata. `npm run typecheck` dan `npm run build` hanya membuktikan tipe dan
perakitan modul.
