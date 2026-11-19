# Aturan `hooks/`

Hook lintas fitur. Hook yang hanya dipakai satu fitur tinggal di
`features/<fitur>/hooks/` — jangan ditaruh di sini.

## Daftar saat ini

| Hook                   | Mengembalikan                                                                    | Dipakai                                    |
| ---------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| `useNotifications.ts`  | `{ anchor, open, toggle, close, read, unread, shown, markRead, markAllRead, … }` | `components/layouts/NotificationsMenu.tsx` |
| `useAdminLiveSync.ts`  | – (efek polling, memanggil `router.refresh()`)                                   | `components/layouts/LiveSync.tsx`          |
| `useOutsideDismiss.ts` | – (menutup panel saat klik di luar / Escape)                                     | notifikasi, `Filters`, `DateCalendar`      |
| `useTrackingPanel.ts`  | dialog Pantau Petugas (board, kirim ulang tautan, ETA)                           | `components/tracking/*`                    |

Hook yang pindah ke fitur: `useLoginForm` (`features/auth`), `useCleanerTask`
(`features/cleaner`), `useCategoryForm`, `useServiceForm`, `useScheduleEditor`,
`usePromoForm`, `usePromoList`, `useFaqForm`, `useStaffForm`, dan `useCustomerForm` (fitur
masing-masing). State sidebar pindah ke `store/uiStore.ts`; `useSidebarCollapse` dihapus.

## Aturan

1. **Nama file camelCase** `useX.ts`, ekspor fungsi dengan nama yang sama.
2. **Satu hook per file.** Helper kecil boleh di file yang sama bila hanya dipakai hook itu.
3. **Tanpa JSX dan tanpa kelas Tailwind.** Kalau butuh markup, itu komponen.
4. **Boleh mengimpor Server Action** (`@/app/actions`, `lib/api/*Action`).
5. **Kembalian berupa objek bernama**, bukan array posisional, dan bentuknya didokumentasikan
   di komentar singkat di atas fungsi.
6. **Hanya dipanggil dari client component.** Tambahkan `'use client'` bila hook memakai API
   browser secara langsung.
7. **Jangan menyimpan data server.** Data dari `cookies()`/API tetap di `page.tsx` dan
   dikirim sebagai props; data client diambil lewat TanStack Query.
8. **Form baru**: pilih satu pola — `useActionState(action, {})` untuk form server, atau
   TanStack `useMutation` bila butuh navigasi/optimistic update (contoh: `useLoginForm`).
