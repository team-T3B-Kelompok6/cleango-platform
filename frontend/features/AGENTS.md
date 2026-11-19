# Aturan `features/`

Satu folder = satu alur bisnis utuh (auth, booking, dst). Fitur memiliki komponennya
sendiri, hook-nya sendiri, dan aturan datanya sendiri. Ini pengganti folder
`components/<fitur>/` untuk fitur yang sudah dimigrasi.

## Bentuk folder

```
features/auth/
├─ api/            Server Action + pemanggilan API fitur (server-only)
├─ components/     markup fitur (PascalCase), boleh 'use client'
├─ data/           tipe, konstanta/teks, validasi (tanpa JSX)
├─ hooks/          state client fitur (useX.ts)
├─ pages/          halaman server yang dirakit dari komponen di atas
└─ index.ts        pintu masuk yang diimpor app/
```

Subfolder dibuat **hanya bila ada isinya**. Fitur kecil tidak perlu `api/` atau `pages/`.

## Aturan

1. **`app/**/page.tsx` hanya merujuk ke `features/<fitur>`.** Import lewat barrel:
   `import { LoginPage } from '@/features/auth';`
2. **Tanpa duplikasi.** Dibutuhkan dua fitur? Naikkan ke `lib/`, `hooks/`, atau
   `components/ui/`, jangan disalin.
3. **Logika dan markup dipisah.**
   - `.tsx` = markup + props. Tidak ada perhitungan panjang di dalamnya.
   - `hooks/` = state, efek, mutasi.
   - `data/` = tipe, konstanta, fungsi murni, validasi.
   - `api/` = Server Action (`'use server'`) dan pemanggilan transport.
4. **Server Action milik fitur tinggal di `features/<fitur>/api/`.** Action lintas fitur
   (logout, resource generik) tinggal di `lib/api/` atau `app/`.
5. **Nama file**: `.tsx` PascalCase, `.ts` camelCase, `index.ts` sebagai pintu masuk.
6. **Token tidak boleh masuk ke client.** Sesi dibaca dari cookie HTTP-only di server
   (`lib/api/session.ts`); jangan mengirim token sebagai props atau menyimpannya di store.
7. **Arah dependensi**: `features/*` boleh mengimpor `components/*`, `lib/*`, `hooks/*`,
   `store/*`. Sebaliknya dilarang.
8. **Tanpa CSS baru.** Gaya memakai Tailwind + token `@theme`.

## Fitur yang sudah dimigrasi

| Fitur        | Isi                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------- |
| `auth`       | login: `data/`, `api/`, `hooks/useLoginForm.ts`, `components/`, `pages/LoginPage.tsx`    |
| `dashboard`  | ringkasan: `data/dashboardSummary.ts`, `data/dashboardCopy.ts`, `api/`, `pages/`         |
| `orders`     | pesanan: `components/` (baris, aksi, assign, preview), `data/`, `api/ordersApi`, actions |
| `cleaner`    | portal petugas: `components/portal/`, `hooks/`, `api/cleanerClientApi.ts`, `pages/`      |
| `categories` | kategori layanan/FAQ: `api/`, `data/`, `hooks/`, `components/`                           |
| `services`   | layanan: `components/`, `data/serviceFormRules.ts`, `hooks/`, `api/`                     |
| `schedules`  | jadwal: `components/` (board + editor), `data/scheduleRules.ts`, `hooks/`, `api/`        |
| `promos`     | promo: `components/`, `data/promoEditor.ts`, `hooks/`, `api/promoActions.ts`             |
| `faqs`       | FAQ: `components/`, `data/faqDisplay.ts`, `data/faqValidation.ts`, `hooks/`, `api/`      |
| `staff`      | petugas: `components/` (row, detail, form), `data/staffFormPayload.ts`, `hooks/`, `api/` |
| `customers`  | customer: `components/`, `data/customerValidation.ts`, `hooks/`, `api/`                  |
| `reports`    | laporan: `data/reportRules.ts`, `pages/ReportPage.tsx`, `components/`                    |
| `audit`      | audit log: `api/auditApi.ts`, `data/auditCopy.ts`, `pages/AuditPage.tsx`, `components/`  |

Fitur lain masih berada di `components/<fitur>/` dan dipindahkan bertahap saat halamannya
disentuh.
