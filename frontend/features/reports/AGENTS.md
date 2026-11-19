# Aturan `features/reports/`

Laporan keuangan & operasional: ringkasan periode, tab grup, grafik, dan ekspor CSV.

## Isi

| Berkas                                              | Lapisan | Isi                                                                                                              |
| --------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| `data/reportRules.ts`                               | data    | validasi bulan, filter pesanan selesai, ringkasan, bucket mingguan, sebaran pembayaran, grup, label, tautan, CSV |
| `data/reportCopy.ts`                                | data    | `REPORT_COPY` + kelas baris                                                                                      |
| `pages/ReportPage.tsx`                              | server  | baca `searchParams`, ambil pesanan, hitung, render                                                               |
| `components/ReportMetrics.tsx`                      | server  | kartu metrik                                                                                                     |
| `components/RevenueChart.tsx`                       | server  | grafik batang mingguan                                                                                           |
| `components/PaymentBreakdown.tsx`                   | server  | sebaran metode pembayaran                                                                                        |
| `components/ReportTabs.tsx`                         | client  | tab grup + tautan periode                                                                                        |
| `components/ReportList.tsx` / `ReportRow.tsx`       | server  | daftar baris laporan                                                                                             |
| `components/ReportActions.tsx` / `PeriodDialog.tsx` | client  | ekspor CSV + pilih periode                                                                                       |
| `components/InvoiceDialog.tsx`                      | client  | detail invoice                                                                                                   |
| `index.ts`                                          | barrel  | dipakai `app/(admin)/laporan/page.tsx`                                                                           |

## Aturan

1. **Semua perhitungan di `data/reportRules.ts`.** `app/(admin)/laporan/export/route.ts` juga
   memakainya; jangan menambah perhitungan di komponen atau route.
2. **Hanya pesanan selesai** yang masuk laporan (`completedOrders`). Jangan melonggarkan
   filter tanpa mengubah laporan dan ekspor sekaligus.
3. **Bulan dibatasi `parseReportMonth`**; jangan membaca `searchParams.month` mentah.
4. **CSV dibuat di `reportRules`**, bukan di komponen.
5. **Uji lewat `npm run check:reports`** setiap mengubah aturan atau label.
