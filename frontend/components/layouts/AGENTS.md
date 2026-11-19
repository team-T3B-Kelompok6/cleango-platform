# Aturan `components/layouts/`

Kerangka halaman: menyusun area (sidebar, header, konten, footer) dan menerima isi lewat
slot. Tidak mengambil data. Diimpor sebagai `@/components/layouts`.

## Struktur

```
components/layouts/
├─ admin/    AdminShell, LiveSync, MobileNav
├─ auth/     AuthLayout
├─ sidebar/  Sidebar, SidebarNav
├─ topbar/   Topbar, TopbarDate, SearchField, UserMenu,
│            NotificationsMenu, NotificationItem
├─ data/     navItems.ts, search.ts, shellCopy.ts (+ index.ts)
├─ Footer.tsx
└─ index.ts  pintu masuk
```

## Daftar saat ini

| Komponen                       | Jenis  | Slot / props                        | Dipakai                             |
| ------------------------------ | ------ | ----------------------------------- | ----------------------------------- |
| `admin/AdminShell.tsx`         | client | `date`, `headerActions`, `children` | `app/(admin)/layout.tsx`            |
| `admin/LiveSync.tsx`           | client | –                                   | `AdminShell`                        |
| `admin/MobileNav.tsx`          | client | –                                   | `Topbar`                            |
| `auth/AuthLayout.tsx`          | server | `headerAction`, `children`          | `features/auth/pages/LoginPage.tsx` |
| `sidebar/Sidebar.tsx`          | server | `collapsed`, `onToggle`             | `AdminShell`                        |
| `sidebar/SidebarNav.tsx`       | client | `showLabels`, `onNavigate`          | `Sidebar`, `MobileNav`              |
| `topbar/Topbar.tsx`            | server | `date`, `actions`                   | `AdminShell`                        |
| `topbar/TopbarDate.tsx`        | server | `date`                              | `Topbar`                            |
| `topbar/SearchField.tsx`       | client | `mobile`, `faq`                     | `Topbar`, `ResourcePages`           |
| `topbar/UserMenu.tsx`          | server | –                                   | `Topbar`                            |
| `topbar/NotificationsMenu.tsx` | client | `orders`, `initialRead`             | `AdminShell` via `headerActions`    |
| `topbar/NotificationItem.tsx`  | server | `order`, `unread`                   | `NotificationsMenu`                 |
| `Footer.tsx`                   | server | –                                   | `AdminShell`                        |
| `data/navItems.ts`             | –      | `NAV_ITEMS`, `NavItem`              | `SidebarNav`                        |
| `data/search.ts`               | –      | `SEARCH_LABELS`, `searchTarget`     | `SearchField`                       |
| `data/shellCopy.ts`            | –      | `SHELL_COPY`                        | semua di atas                       |

## Aturan

1. **Tanpa data.** `cookies()`, `fetch`, dan `process.env` tetap di `app/**/layout.tsx`.
2. **`'use client'` hanya bila butuh state/DOM event.** `AdminShell`, `MobileNav`,
   `SidebarNav`, `SearchField`, `NotificationsMenu`, `LiveSync` butuh; `Sidebar`, `Topbar`,
   `UserMenu`, `Footer`, `TopbarDate` tidak.
3. **Slot eksplisit.** Nama prop menggambarkan posisi (`headerActions`, `children`), bukan
   nilai bisnis (`isDemo`, `session`).
4. **State collapse satu pintu.** `AdminShell` membaca `useUiStore` (`@/store/uiStore`) lalu
   memasang `data-collapsed` pada elemen `group`. Jangan menambah hook lokal atau atribut
   manual dari komponen lain.
5. **Kontrak selector untuk kode non-React.** Topbar memasang `data-topbar`; `Filters.tsx`
   memakai `[data-topbar]` untuk memposisikan popover tanggal. Jangan diganti kelas Tailwind.
6. **Elemen semantik wajib**: satu `<main>` per halaman, `<header>` untuk area atas,
   `<aside aria-label>` untuk sidebar. `AuthLayout` memakai class `login-page` karena CSS
   legacy memakai `main:not(.login-page)` sebagai opt-out.
7. **Boleh memakai `ui/*`** (`Button`, `Avatar`, `IconButton`). **Tidak boleh** mengimpor
   `features/*`, kecuali `auth/AuthLayout` sebagai kerangka halaman login (hanya slot).
8. **Teks milik layout** hanya di `data/shellCopy.ts`; teks per halaman lewat props.
9. **Logout lewat `@/lib/api/logoutAction`**, bukan dari satu fitur.

## Menambah layout baru

Buat subfolder baru (`admin/`, `auth/`, …) atau file di akar bila berdiri sendiri, ekspor
lewat `index.ts`, lalu perbarui tabel di atas.
