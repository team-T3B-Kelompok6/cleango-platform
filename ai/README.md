# CleanGo AI-00

Pipeline untuk menyiapkan, melatih, mengevaluasi, dan menjalankan prediksi ETA serta risiko keterlambatan CleanGo dari dataset publik Cainiao-AI LaDe.

## Yang sudah dapat digunakan

- Regresi ETA dengan ridge regression.
- Klasifikasi terlambat/tidak terlambat dengan logistic regression.
- Split train/validation/test berdasarkan waktu dan perjalanan tanpa leakage.
- Satu checkpoint klasifikasi per perjalanan, 2 menit setelah berangkat dan sebelum jadwal.
- Model JSON kecil yang dapat di-commit dan modul inferensi dengan validasi input.

Model ini siap untuk demo teknis, belum untuk keputusan produksi. Jadwal dan label terlambat masih simulasi, sementara pola perjalanan berasal dari Chongqing sebagai proxy kota padat.

## Menjalankan

Gunakan Python 3.11 atau lebih baru dari folder `ai/`.

```powershell
python -m pip install -r requirements.txt
python pipeline.py --source-dir "C:\coding\s3\PBL\datasets\CleanGo-LaDe"
python train.py
python predict.py --input sample_prediction_input.json
python -m unittest discover -s tests
```

Hasil dataset ditulis ke `data/processed/sample_v2/`, sedangkan model dan metrik ditulis ke `artifacts/sample_v2/`.

## Input prediksi dari aplikasi

Backend perlu membentuk satu snapshot JSON berisi waktu prediksi, ETA dasar dari layanan routing, waktu sejak cleaner berangkat, durasi berhenti, jarak rute tersisa dan awal, kecepatan rolling dan kecepatan rute yang diharapkan, serta sisa detik menuju jadwal.

Contoh lengkap tersedia di `sample_prediction_input.json`. `predict.py` mengubah nilai tersebut menjadi fitur rasio yang tidak bergantung pada satuan koordinat LaDe, lalu mengeluarkan `eta_seconds`, `late_probability`, `late_prediction`, dan `risk_level`.

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

artifacts/sample_v2/
├── eta_ridge_model.json
├── late_logistic_model.json
└── metrics.json
```

## Batasan penting

- Tahun `2000` pada timestamp hanya placeholder karena sumber tidak menyimpan tahun.
- Koordinat LaDe telah ditransformasi. Koordinat mentah hanya disimpan untuk audit, bukan fitur model.
- `scheduled_at`, `late_label`, dan `risk_level` adalah simulasi.
- Model harus dilatih dan diuji ulang dengan booking, GPS WGS84, ETA routing, dan hasil perjalanan CleanGo yang nyata sebelum dipakai di lapangan.

Lihat `docs/AI-00.md` untuk checklist dan `docs/DATA_DICTIONARY.md` untuk definisi kolom.
