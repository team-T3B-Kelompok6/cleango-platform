# Kamus Data AI-00

## `trips.csv`

| Kolom | Arti |
| --- | --- |
| `trip_id`, `courier_id` | ID hasil hash ulang. |
| `accepted_at`, `started_at`, `completed_at` | Event waktu perjalanan sumber. |
| `scheduled_at` | Jadwal simulasi untuk eksperimen klasifikasi. |
| `schedule_is_simulated` | Penanda jadwal bukan data CleanGo. |
| `destination_x/y` | Tujuan dalam koordinat transformasi LaDe; bukan meter/WGS84. |
| `actual_duration_seconds` | Durasi perjalanan aktual. |
| `actual_delay_seconds` | Selisih selesai aktual terhadap jadwal simulasi. |
| `late_label` | Target klasifikasi biner simulasi. |
| `risk_level` | Label deskriptif `low`, `medium`, atau `high`. |
| `data_split` | `train`, `validation`, atau `test`. |

## `gps_points.csv`

Riwayat titik anonim untuk audit dan reproduksi fitur. `position_x/y` memakai koordinat transformasi sumber dan tidak dipakai langsung oleh model v2.

## `eta_training.csv`

Target: `actual_remaining_seconds`.

| Fitur model v2 | Arti |
| --- | --- |
| `baseline_eta_seconds` | ETA dari proxy routing; produksi harus memakai Maps/routing API. |
| `elapsed_seconds` | Waktu sejak perjalanan dimulai. |
| `stopped_duration_seconds` | Akumulasi waktu berhenti. |
| `distance_ratio` | Jarak tersisa dibagi jarak awal. |
| `rolling_speed_ratio` | Kecepatan rolling dibagi kecepatan rute yang diharapkan. |
| `eta_elapsed_ratio` | ETA dasar dibagi ETA dasar + waktu berlalu. |
| `hour_sin`, `hour_cos` | Jam dalam bentuk siklik. |

Kolom dengan akhiran `_units` tetap disimpan untuk audit tetapi bukan fitur model v2.

## `risk_training.csv`

Target: `late_label`. Hanya satu baris per perjalanan: titik pertama setelah 120 detik sejak berangkat yang masih berada sebelum jadwal.

| Fitur model v2 | Arti |
| --- | --- |
| `eta_model_lateness_seconds` | Prediksi ETA model dikurangi sisa waktu menuju jadwal. |
| `eta_schedule_ratio` | ETA dasar dibagi sisa waktu menuju jadwal. |
| `predicted_lateness_seconds` | ETA dasar dikurangi sisa waktu menuju jadwal. |
| `elapsed_seconds`, `stopped_duration_seconds` | Progres waktu dan berhenti. |
| `distance_ratio`, `rolling_speed_ratio` | Progres jarak dan kecepatan relatif. |
| `hour_sin`, `hour_cos` | Jam dalam bentuk siklik. |
| `label_is_simulated` | Penanda eksplisit bahwa target belum berasal dari CleanGo. |
