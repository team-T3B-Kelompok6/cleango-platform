# CleanGo AI

Pipeline untuk menyiapkan, melatih, mengevaluasi, dan menjalankan prediksi ETA perjalanan, risiko keterlambatan, serta durasi pengerjaan CleanGo.

## Yang sudah dapat digunakan

- Perbandingan Logistic Regression, Decision Tree, dan Random Forest untuk risiko keterlambatan AI-02.
- Split train/validation/test berdasarkan waktu dan perjalanan tanpa leakage.
- Satu checkpoint klasifikasi per perjalanan, 2 menit setelah berangkat dan sebelum jadwal.
- Perbandingan Linear Regression, Ridge Regression, Decision Tree, dan Random Forest untuk AI-01.
- Model ETA terbaik disimpan sebagai satu pipeline Joblib agar preprocessing saat training dan inference tetap sama.
- Layanan inference Flask memuat model satu kali saat proses dimulai.
- Model klasifikasi terbaik, preprocessing, serta ambang risiko disimpan bersama dalam Joblib.
- Regresi durasi pengerjaan membandingkan Linear Regression, Decision Tree, dan Random Forest, lalu menyimpan model terbaik bersama preprocessing dalam Joblib.
- Layanan baru yang belum ada pada training memakai durasi SOP sebagai fallback.

Model ini siap untuk demo teknis, belum untuk keputusan produksi. Jadwal dan label terlambat masih simulasi, sementara pola perjalanan berasal dari Chongqing sebagai proxy kota padat.

## Menjalankan

Gunakan Python 3.11 atau lebih baru dari folder `ai/`.

```powershell
python -m pip install -r requirements.txt
python pipeline.py --source-dir "C:\coding\s3\PBL\datasets\CleanGo-LaDe"
python train_eta.py
python train_risk.py
python train_work_duration.py --source "C:\coding\s3\PBL\datasets\CleanGo-pengerjaan\CleanGo_Prediksi_Durasi_Pengerjaan_SIMULASI\dataset_durasi_cleaning_SIMULASI.csv"
$env:ALLOW_SYNTHETIC_WORK_DURATION_MODEL="true"
python service.py
python -m unittest discover -s tests
```

Hasil dataset AI-00 ditulis ke `data/processed/sample_v2/`. Model regresi AI-01 ditulis ke `artifacts/eta_v1/`, classifier AI-02 ke `artifacts/risk_v1/`, dan model durasi pengerjaan ke `artifacts/work_duration_v1/`.

Setelah `service.py` aktif, cek model dengan:

```powershell
Invoke-RestMethod http://127.0.0.1:5000/health
Invoke-RestMethod http://127.0.0.1:5000/predict/eta `
  -Method Post `
  -ContentType 'application/json' `
  -InFile sample_eta_input.json
Invoke-RestMethod http://127.0.0.1:5000/predict/risk `
  -Method Post `
  -ContentType 'application/json' `
  -InFile sample_risk_input.json
Invoke-RestMethod http://127.0.0.1:5000/predict/work-duration `
  -Method Post `
  -ContentType 'application/json' `
  -InFile sample_work_duration_input.json
```

Untuk menjalankan alur aplikasi lengkap, nyalakan tiga terminal:

```powershell
# Terminal 1
cd ai
python service.py

# Terminal 2
cd backend
npm run dev

# Terminal 3
cd frontend
npm run dev
```

Android Emulator mengakses Express melalui `http://10.0.2.2:3001/api`. Untuk perangkat fisik, jalankan Flutter dengan alamat IP laptop pada jaringan yang sama:

```powershell
flutter run --dart-define=API_URL=http://192.168.1.10:3001/api
```

## Input prediksi dari aplikasi

Backend perlu membentuk satu snapshot JSON berisi waktu prediksi, ETA dasar dari layanan routing, waktu sejak cleaner berangkat, durasi berhenti, jarak rute tersisa dan awal, kecepatan rolling dan kecepatan rute yang diharapkan, serta sisa detik menuju jadwal.

Contoh input terpisah tersedia di `sample_eta_input.json`, `sample_risk_input.json`, dan `sample_work_duration_input.json`. Endpoint Flask menjalankan pipeline Joblib yang sama dengan hasil training sehingga urutan preprocessing dan fitur tidak berubah saat inference.

## Output

```text
data/processed/sample_v2/
├── trips.csv
├── gps_points.csv
├── eta_training.csv
├── risk_training.csv
├── splits.csv
├── train/
├── validation/
├── test/
└── validation_report.json

artifacts/eta_v1/
├── eta_pipeline.joblib
├── metrics.json
└── model_info.json

artifacts/risk_v1/
├── risk_pipeline.joblib
├── metrics.json
└── model_info.json

artifacts/work_duration_v1/
├── duration_pipeline.joblib
└── metrics.json
```

## Batasan penting

- Tahun `2000` pada timestamp hanya placeholder karena sumber tidak menyimpan tahun.
- Koordinat LaDe telah ditransformasi. Koordinat mentah hanya disimpan untuk audit, bukan fitur model.
- `scheduled_at`, `late_label`, dan `risk_level` adalah simulasi.
- Model harus dilatih dan diuji ulang dengan booking, GPS WGS84, ETA routing, dan hasil perjalanan CleanGo yang nyata sebelum dipakai di lapangan.
- Server publik OSRM hanya dipakai untuk demo akademik dan tidak menyediakan kondisi lalu lintas langsung. Penggunaan produksi harus memakai instance sendiri atau penyedia dengan SLA.
- Baseline historis pada dataset LaDe adalah proxy kecepatan rute, bukan hasil OSRM. Perbandingan ulang terhadap snapshot OSRM nyata wajib dilakukan ketika perjalanan CleanGo sudah terkumpul.
- Model durasi pengerjaan dilatih dari skenario SOP sintetis. Aktifkan `ALLOW_SYNTHETIC_WORK_DURATION_MODEL=true` hanya untuk demo; tanpa variabel tersebut endpoint otomatis memakai fallback SOP.

Lihat `docs/AI-00.md`, `docs/AI-01.md`, `docs/AI-02.md`, dan `docs/DATA_DICTIONARY.md` untuk checklist serta definisi kolom.
