# Aturan `components/tracking/`

Panel **Pantau Petugas**. Ini komponen bersama, bukan fitur: dipakai dua alur berbeda.

| Pemakai                                       | Cara memakai                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| `features/orders/components/OrderActions.tsx` | `TrackingButton name orderId` pada baris pesanan                       |
| `features/staff/components/StaffRow.tsx`      | `TrackingButton name label="Lihat lokasi"` pada baris petugas          |
| `components/resource/ResourcePages.tsx`       | `TrackingButton` tanpa nama (papan semua petugas) di header `/petugas` |

## Kenapa bukan `features/`

Kalau dipindah ke `features/tracking`, maka `features/orders` dan `features/staff` harus
mengimpor fitur lain — arah dependensi yang dilarang. Karena itu panel tinggal di
`components/`, dan aturan murninya tetap di `lib/tracking.ts`.

## Isi

| Berkas                    | Jenis   | Isi                                               |
| ------------------------- | ------- | ------------------------------------------------- |
| `TrackingButton.tsx`      | client  | pembuka dialog + pemilihan lebar/subtitle         |
| `TrackingPanel.tsx`       | client  | kerangka panel (papan vs pratinjau)               |
| `MonitorBoard.tsx`        | client  | daftar grup penugasan                             |
| `StaffMonitorCard.tsx`    | client  | kartu satu penugasan                              |
| `PreviewPane.tsx`         | client  | iframe halaman tugas petugas                      |
| `StaffLocationDialog.tsx` | client  | lokasi terakhir petugas                           |
| `trackingClientApi.ts`    | browser | `fetchTaskBoard`, `resendTaskLink`, `requestRisk` |
| `data.ts`                 | –       | kelas bersama                                     |

State, polling 5 detik, kirim ulang tautan, dan prediksi ETA ada di
`hooks/useTrackingPanel.ts`. Perhitungan murni (grup, jadwal, urutan tugas) ada di
`lib/tracking.ts`.

## Aturan

1. **Transport hanya lewat `trackingClientApi.ts`.** Jangan menulis `fetch` baru di komponen
   atau hook.
2. **Polling berhenti saat `document.hidden`** atau saat request lain berjalan.
3. **Setelah aksi sukses, papan diperbarui** lalu `router.refresh()` agar halaman admin ikut.
4. **Jangan menaruh aturan bisnis** (prioritas, ETA) di `.tsx`; tambahkan fungsi murni di
   `lib/tracking.ts`.
5. **Iframe memakai `?embed=1`**, jangan mengubah kontrak itu tanpa menyesuaikan portal
   petugas.
