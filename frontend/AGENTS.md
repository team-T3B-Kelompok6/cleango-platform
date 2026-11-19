<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Aturan web admin CleanGo

## Sebelum menulis kode

1. Baca `frontend/DESIGN.md` (kontrak warna, tipografi, radius, bayangan, dan jebakan
   migrasi Tailwind).
2. Baca `AGENTS.md` terdekat di folder yang dikerjakan.
3. Untuk API Next.js, baca `node_modules/next/dist/docs/` — versi ini punya perubahan yang
   tidak ada di pengetahuan umum.

## Stack

- Next.js 16 App Router (Server Component sebagai default), React 19, TypeScript strict
  (`noUnusedLocals`, `noUnusedParameters`).
- Tailwind CSS 4 lewat `@tailwindcss/postcss`; token di `@theme` dalam `app/globals.css`.

## Struktur folder

| Folder                | Isi                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------- |
| `app/`                | routing Next saja: `page.tsx`/`layout.tsx` tipis, Route Handler, `*.css` legacy       |
| `components/`         | lihat `components/AGENTS.md`                                                          |
| `components/ui/`      | primitif presentasional: `Button`, `Input`, `Label`, `Card`, `Select`, `Modal`        |
| `components/layouts/` | kerangka halaman: `AuthLayout`, `AdminShell` + sidebar/topbar/footer                  |
| `features/<fitur>/`   | satu alur bisnis utuh: `components/`, `hooks/`, `data/`, `api/`, `pages/`             |
| `lib/`                | util murni dan akses data lintas fitur (`cn.ts`, `api/`, `pagination.ts`)             |
| `lib/api/`            | transport HTTP: `serverApi.ts` (fetch + cookie), `http.ts` (get/post/…), `*Action.ts` |
| `hooks/`              | hook lintas fitur; hook milik satu fitur tinggal di `features/<fitur>/hooks/`         |
| `store/`              | state UI global Zustand (bukan data server)                                           |
| `types/`              | tipe lintas fitur                                                                     |

## Aturan lapisan

1. `app/` hanya berisi routing, metadata, dan pembacaan `searchParams`. Isi halaman
   diimpor dari `features/<fitur>` — jangan menulis markup besar di `app/**/page.tsx`.
2. `components/ui/` adalah primitif murni; `components/layouts/` adalah kerangka dengan
   slot; `components/<nama>/` yang tersisa adalah komponen lama yang belum dimigrasi.
3. `features/<fitur>/` tidak boleh diimpor oleh `lib/`, `store/`, atau `components/layouts/`.
   Ketergantungan hanya satu arah: `app` → `features` → `components`/`lib`/`hooks`/`store`.
4. Jangan menaruh logika di file `.tsx`. State dan efek masuk `hooks/`, aturan murni masuk
   `data/`, dan `.tsx` hanya merender markup. Pengecualian: primitif di `components/ui/`.
5. Jangan menduplikasi fungsi. Kalau dipakai dua tempat, pindahkan ke `lib/` (mis.
   `formatDate()`), bukan disalin.
6. Satu API call satu pintu: Server Component memakai helper bertipe `get/post/patch/put/del`
   dari `lib/api` (di atas `serverApi`). Browser memanggil Route Handler Next lewat transport
   per fitur (`features/cleaner/api/cleanerClientApi.ts`,
   `components/tracking/trackingClientApi.ts`) — jangan menulis `fetch` baru di komponen.

## Penamaan file

- Komponen React (`.tsx`): **PascalCase** — `LoginForm.tsx`, `AuthLayout.tsx`, `Button.tsx`.
- File selain `.tsx` (`.ts`): **camelCase** — `authTypes.ts`, `useLoginForm.ts`, `cn.ts`.
- Pengecualian: `index.ts` sebagai pintu masuk folder.
- Di dalam `app/`: ikuti konvensi Next (`page.tsx`, `layout.tsx`, `route.ts`, `providers.tsx`).

## Styling

- Satu sumber token: blok `@theme` di `app/globals.css` (DESIGN.md §9). Jangan menambah
  token tanpa memperbarui DESIGN.md.
- **Dilarang** membuat file `.css` baru, CSS Module, `<style jsx>`, atau menulis hex /
  `rgb()` / `oklch()` di TSX.
- Kelas Tailwind harus literal. Variasi status memakai map objek berisi string penuh,
  bukan `'badge ' + tone`.
- Kelas kondisional memakai `cn()` dari `lib/cn.ts`.
- Selama 7 file CSS legacy masih ada: utility Tailwind kalah dari aturan unlayered. Aturan
  CSS halaman harus dihapus bersamaan dengan konversinya, bukan sesudahnya.
- `app/admin.css` sudah dihapus; jangan menghidupkan kembali file CSS halaman tanpa membuang
  selector yang tidak dipakai.
- Desain desktop-first: gunakan varian `max-sm:` / `max-md:` / `max-lg:` / `max-xl:`.
- Satu langkah `--spacing` = 1px (`p-12` = 12px). Jangan menghitung kelipatan 4.

## Batas server/client

- Default server component. Tambahkan `'use client'` hanya bila butuh hook, event handler,
  atau API browser.
- Data server (cookies, env, API) tetap di `app/**/page.tsx`; komponen menerima props.
- Server action boleh diimpor langsung di client component.

## Verifikasi wajib sebelum menyatakan selesai

```bash
npm run typecheck
npm run build
npm run format:check
npm run check:categories   # dan check:* lain yang relevan
```

Sebutkan perintah yang benar-benar dijalankan dan yang belum bisa dijalankan (mis. butuh
backend/DB) di laporan. Jangan menandai selesai tanpa bukti.

## Menjalankan stack

Halaman admin mengambil semua data dari API Express. Tanpa backend, halaman gagal 503
_"Layanan data belum dapat dihubungi"_ — itu bukan bug tampilan.

```bash
npm run dev            # dari root: backend + frontend
npm run dev:backend    # backend saja (port dari backend/.env)
npm run dev:frontend   # frontend saja (port 3000)
```

`API_URL` di `frontend/.env.local` harus menunjuk port yang sama dengan `PORT` di
`backend/.env`. Next hanya membaca `.env.local` saat start, jadi restart setelah mengubahnya.
Kalau 503 muncul, cari log `[api] gagal menghubungi <url> (<penyebab>)` di terminal Next.
