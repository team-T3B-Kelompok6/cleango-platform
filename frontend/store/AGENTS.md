# Aturan `store/`

State UI global dengan Zustand. **Bukan** tempat data server.

## Isi

| Berkas       | State                                                                     |
| ------------ | ------------------------------------------------------------------------- |
| `uiStore.ts` | `sidebarCollapsed`, `sidebarReady`, `toggleSidebar()`, `restoreSidebar()` |

## Aturan

1. **Hanya UI.** Yang boleh: sidebar, tema, panel terbuka. Yang dilarang: pesanan, sesi,
   token, hasil `fetch`, atau apa pun yang berasal dari API.
2. **Data server tetap milik TanStack Query**; sesi tetap di cookie HTTP-only.
3. **Persistensi lewat kunci ber-prefix** (`cleango:*`) dan selalu dibungkus `try/catch`,
   karena `localStorage` bisa diblokir.
4. **Satu store satu tanggung jawab.** Jangan menambah field yang tidak dipakai minimal dua
   komponen.
5. **Nama file camelCase** (`uiStore.ts`), ekspor hook `useXStore`.
6. **`restoreSidebar()` idempoten.** Dipanggil dari `useEffect` di `AdminShell`; jangan
   memindahkan pembacaan `localStorage` ke dalam render.
7. **Jangan mengimpor `features/*`.** Store adalah lapisan paling bawah.
