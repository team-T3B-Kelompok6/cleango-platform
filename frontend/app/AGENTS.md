# Aturan `app/`

Routing Next.js saja. Folder ini mengikat URL ke halaman, bukan tempat menulis UI besar.

## Boleh berisi

| Berkas                                      | Isi                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------- |
| `layout.tsx`                                | root layout: font, `Providers`, impor CSS global                      |
| `providers.tsx`                             | provider client global (TanStack Query)                               |
| `<rute>/page.tsx`                           | pembungkus tipis: `metadata`, `searchParams`, impor dari `features/*` |
| `<rute>/route.ts`                           | Route Handler (mis. `laporan/export`, `tugas/[token]`)                |
| `actions.ts` dan `*-actions.ts`             | Server Action lintas fitur (resource generik, kategori, promo)        |
| `*.css`                                     | CSS legacy yang belum bisa dikonversi                                 |
| `error.tsx`, `loading.tsx`, `not-found.tsx` | boundary Next                                                         |

## Aturan

1. **`page.tsx` tipis.** Maksimal: `metadata`, `export const dynamic`, baca `searchParams`,
   lalu `<XPage ... />` dari `@/features/<fitur>`. Jangan menulis form/tabel di sini.
2. **Data server tetap di sini atau di `features/*/pages/`.** `cookies()`, `process.env`, dan
   `GET` awal boleh; komponen presentasional menerima props.
3. **Server Action milik satu fitur** tinggal di `features/<fitur>/api/*Actions.ts`. Yang
   dipakai banyak fitur (logout, resource generik) tinggal di `lib/api/` atau `app/`.
4. **Jangan menambah file `.css`.** Konversi ke Tailwind; `admin.css` sudah dihapus.
   `tokens.css` + `globals.css` tetap sumber token.
5. **Jangan menyimpan halaman di dua tempat.** Kalau `features/<fitur>/pages/XPage.tsx` ada,
   `app/**/page.tsx` hanya merujuk ke situ.
6. **Nama berkas mengikuti Next** (`page.tsx`, `layout.tsx`, `route.ts`), bukan PascalCase.

## Rute saat ini

`/login` (publik) dan grup `(admin)` untuk dashboard. `/tugas/[token]` adalah portal petugas
yang juga dipakai sebagai iframe oleh dialog Pantau Petugas.
