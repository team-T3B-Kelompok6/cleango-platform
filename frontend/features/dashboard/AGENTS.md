# Aturan `features/dashboard/`

Halaman Dashboard Utama. Semua pembacaan data terjadi di server; tidak ada state client.

## Isi

| Berkas                            | Lapisan | Isi                                                             |
| --------------------------------- | ------- | --------------------------------------------------------------- |
| `data/dashboardSummary.ts`        | data    | `summarize()`, `loadDashboardOrders()`, tipe `DashboardSummary` |
| `data/dashboardCopy.ts`           | data    | `DASHBOARD_COPY`, `buildMetrics()`                              |
| `api/dashboardApi.ts`             | server  | `getDashboardSummary(now?)` — baca pesanan lalu agregasi        |
| `components/DashboardView.tsx`    | markup  | header, pengumuman, metrik, aktivitas                           |
| `components/ActivityList.tsx`     | markup  | daftar aktivitas + empty state                                  |
| `components/ActivityRow.tsx`      | markup  | satu baris pesanan terbaru                                      |
| `components/AnnouncementCard.tsx` | markup  | kartu pengumuman operasional                                    |
| `pages/DashboardPage.tsx`         | server  | mengambil ringkasan lalu merender `DashboardView`               |
| `index.ts`                        | barrel  | dipakai `app/(admin)/page.tsx`                                  |

## Aturan

1. **Perhitungan tetap murni.** `summarize()` menerima `now` agar hasilnya bisa diuji; jangan
   memanggil `Date.now()` di komponen.
2. **Satu request.** `loadDashboardOrders()` adalah satu-satunya pengambilan data; jangan
   menambah `fetch` di komponen.
3. **Teks di `dashboardCopy.ts`**, bukan di `.tsx`.
4. **Jangan menaruh data server di store.** `store/` hanya untuk state UI.
5. **Baris aktivitas memakai `lib/display` dan `lib/order-flow`**, bukan format tanggal lokal.

## Batas verifikasi

`npm run typecheck`/`npm run build` membuktikan tipe dan perakitan. Tampilan dashboard perlu
dibuktikan dengan backend aktif; tanpa backend halaman gagal 503.
