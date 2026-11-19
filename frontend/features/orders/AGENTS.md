# Aturan `features/orders/`

Kelola Pesanan: baca (daftar/detail), assign petugas, ubah, dan hapus.

## Isi

| Berkas                                | Lapisan | Isi                                                    |
| ------------------------------------- | ------- | ------------------------------------------------------ |
| `api/ordersApi.ts`                    | server  | `getOrders`, `getOrder`, `getAssignmentLookups`        |
| `api/ordersActions.ts`                | server  | `assignOrderAction` (`'use server'`)                   |
| `components/OrderList.tsx`            | server  | membaca staf untuk avatar, merender baris              |
| `components/OrderRow.tsx`             | server  | ringkasan satu pesanan + aksi                          |
| `components/OrderActions.tsx`         | server  | Pantau, Tugaskan, Ubah, Detail, Hapus                  |
| `components/AssignmentFormServer.tsx` | server  | menyiapkan kandidat petugas untuk dialog               |
| `components/AssignmentForm.tsx`       | client  | markup pilihan petugas (`useActionState`)              |
| `components/BookingPreview.tsx`       | server  | rincian pesanan/jadwal di dialog detail                |
| `data/orderConstants.ts`              | data    | `ORDER_COPY`                                           |
| `index.ts`                            | barrel  | dipakai `components/resource/ResourcePages` dan detail |

## Alur mutasi

| Aksi   | Entry point                               | Catatan                                             |
| ------ | ----------------------------------------- | --------------------------------------------------- |
| Assign | `assignOrderAction` → `PATCH /orders/:id` | verifikasi status, domain demo, jadwal, hasil PATCH |
| Ubah   | `saveAction('orders', id, …)`             | masih memakai registry resource lintas fitur        |
| Hapus  | `deleteAction('orders', id, …)`           | masih memakai registry resource lintas fitur        |

`saveAction`/`deleteAction` tinggal di `app/actions.ts` karena dipakai enam resource. Itu
pengecualian yang disengaja: memindahkannya akan menduplikasi aturan validasi. Yang khas
pesanan (assign + validasi kandidat/jadwal) ada di fitur ini.

## Aturan

1. **Assign wajib lewat `assignOrderAction`**, jangan menulis PATCH langsung di komponen.
2. **Kandidat dari `getAssignmentLookups()`**, bukan `list()` tersebar di komponen.
3. **Baca pesanan lewat `ordersApi`** agar validasi bentuk (`list`/`detail`) tetap satu jalur.
4. **Teks di `orderConstants.ts`.**
5. **Jangan menambah form "Tambah Pesanan".** Pesanan lahir dari aplikasi pelanggan.
6. **Baris pesanan memakai `lib/display`, `lib/order-flow`, `lib/staff-photo`** — jangan
   menulis format atau perhitungan baru di `.tsx`.

## Batas verifikasi

Assign end-to-end butuh pesanan berstatus `Menunggu Assign` di backend. Jika tidak ada,
dialog dan action hanya terbukti lewat `typecheck`/`build`.
