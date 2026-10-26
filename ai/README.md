# CleanGo — CS AI dan algoritma operasional

Revisi aktif 25 Oktober 2026. AI hanya dipakai oleh **Boo sebagai Customer Service AI**.
Estimasi ETA, risiko terlambat, dan waktu selesai memakai algoritma biasa di Express.

## Runtime aktif

- CS AI: `backend/src/lib/chatbot.ts`, `chatbot-knowledge.ts`, dan `groq-chat.ts`.
- Routing OSRM dan aturan jadwal: `backend/src/controller/tracking.controller.ts`.
- Rumus waktu selesai: `backend/src/lib/work-estimate.ts`.
- Jalankan backend, frontend, MySQL/Laragon, dan Flutter seperti biasa. **Python tidak perlu dijalankan.**
- Key Groq tetap di backend. Tidak ada key di aplikasi Flutter atau bundle web.
- [Alur lengkap, rumus, file, dan batasan](docs/CS_AI_DAN_ALGORITMA.md).

## Cleanup eksperimen ML

Pipeline/training/inference Python, server Flask lama, pengujian ML, contoh input,
requirements Python, dan dua notebook pemanggil script lama sudah dihapus setelah
dipastikan tidak dipakai aplikasi aktif. Tidak perlu menjalankan `python service.py`
atau menginstal dependency ML.

Dataset, artefak Joblib, metadata/metrik eksperimen, dan dokumentasi historis tetap
disimpan; tidak dilatih ulang atau ditimpa. Data simulasi tidak membuktikan akurasi
dunia nyata. Artefak ini bukan dependency runtime dan tidak dimuat aplikasi.

Kode eksperimen lama masih tersedia dalam riwayat Git, misalnya commit `bf0e66e`.
Jika diperlukan untuk referensi, lihat riwayat file; jangan mengembalikannya ke runtime
aktif tanpa keputusan terpisah.

Dokumentasi historis: [AI-00](docs/AI-00.md), [AI-01](docs/AI-01.md),
[AI-02](docs/AI-02.md), dan [AI-04 lama](docs/AI-04.md).
Jika dokumentasi lama berbeda, ikuti dokumen revisi aktif di atas.
