# CleanGo: CS AI dan estimasi tanpa ML

Revisi aktif 25 Oktober 2026. Dua fokus saja: CS AI, serta penggantian estimasi ML dengan algoritma biasa. Tidak ada implementasi foto/kekotoran/harga otomatis dalam revisi ini.

## 1. Alur customer service

Flutter membuka halaman **Boo · CS AI** dengan komponen dan riwayat percakapan yang sudah ada. Nama folder/class/endpoint lama `chatbot` sengaja tetap dipakai agar navigasi dan riwayat tidak rusak; perannya sekarang customer service otomatis.

Alur pesan: Flutter → `POST /api/customer/chat` di Express → validasi pesan/sesi → pemilihan sumber resmi → Groq → validasi jawaban → Flutter.

- `backend/src/lib/chatbot.ts`: memilih konteks dan sumber sesuai pertanyaan. Keluhan diarahkan ke prosedur keluhan, bukan otomatis dianggap sedang membeli layanan atau meminta status pribadi.
- `backend/src/lib/chatbot-knowledge.ts`: panduan aplikasi dan bantuan umum. Tidak menyimpan nilai pengganti harga, promo, atau status pesanan.
- `backend/src/lib/groq-chat.ts`: prompt peran CS AI, panggilan Groq, fallback model, minimisasi data, dan pemeriksaan jawaban. Temperatur tetap rendah (`0.2`); bukan jaminan kebenaran.
- `backend/src/model/chatbot.model.ts`: pembacaan promo dan pesanan dengan SQL terparameterisasi. Pesanan difilter berdasarkan pelanggan yang terautentikasi. Detail pribadi tidak dikirim ke LLM.
- Flutter `lib/features/chatbot/`: mengirim pesan, menampilkan jawaban backend, dan mempertahankan riwayat lokal terpisah per sesi.

CS menjawab dengan empati dan meminta satu klarifikasi yang berguna jika perlu. Untuk keputusan sensitif atau provider gagal, jawaban terkontrol tetap digunakan. “Full AI” berarti pelanggan dibantu CS otomatis, bukan memberi LLM akses bebas melakukan transaksi atau menjamin semua jawabannya benar.

Saat ini CS tidak membuat tiket, memesan/membatalkan layanan, menyetujui refund, menerapkan promo, atau mengirim laporan ke admin. Jangan menampilkan seolah aksi itu sudah terjadi. Harga/promo/kebijakan hanya mengikuti database resmi; jika kosong/gagal, status tersebut dijelaskan tanpa mengarang.

## 2. Alur penugasan dan perjalanan

Admin menugaskan cleaner internal memakai alur yang sudah ada. Cleaner membuka link tugas dan membagikan GPS. **GPS menentukan posisi**, bukan AI. Koordinat terkini dan tujuan dikirim ke Express untuk mendapatkan rute OSRM.

`backend/src/controller/tracking.controller.ts` kini menghitung langsung tanpa Python:

- `POST /api/tracking/eta`: mengambil durasi rute dan jarak OSRM. Menit dibulatkan ke atas. Sumber `osrm`, versi perhitungan `route-v1`.
- `POST /api/tracking/risk`: `sisa waktu menuju jadwal = jadwal − waktu perhitungan`; `perkiraan selisih = durasi rute − sisa waktu`. Tepat waktu → rendah; melewati jadwal hingga 10 menit → sedang; lebih dari 10 menit → tinggi. Jadwal yang sudah lewat memicu pemeriksaan tinggi.
- Belum berangkat dan sisa waktu kurang dari durasi rute + buffer 5 menit → peringatan minimal sedang. Buffer ini aturan operasional, bukan hasil belajar model.
- GPS tidak diperbarui 5 menit → minimal sedang; 10 menit → tinggi. Data lama **bukan bukti no-show**: `latePrediction=null` dan alasannya dijelaskan. Tidak ada probabilitas palsu; `lateProbability=null`.

Endpoint berakhiran `-preview` yang sudah ada tetap khusus development dan tidak tersedia di production. Booking server Mobile kini menggunakan endpoint ownership yang dijelaskan di bagian 5; pesanan demo lokal masih memakai preview. Perubahan ini tidak mengklaim semua alur GPS nyata sudah selesai. Akses endpoint normal tetap membutuhkan autentikasi.

OSRM demo tidak menyediakan lalu lintas atau cuaca real-time. Jika routing gagal, API mengembalikan error yang jelas dan mobile mempertahankan hasil terakhir; bukan mengarang estimasi dari ML atau jarak lurus. Peta dan alamat tidak berubah menjadi Chongqing: dataset lama tidak dipakai.

## 3. Alur pengerjaan hingga selesai

Cleaner menekan mulai pekerjaan → waktu mulai dicatat → `waktu perkiraan selesai = waktu mulai + durasi layanan`.

Contoh: mulai 09.00, durasi 120 menit → perkiraan selesai 11.00. Tidak memerlukan model, training, atau dataset.

- `backend/src/lib/work-estimate.ts`: rumus bersama untuk endpoint perhitungan, daftar booking pelanggan, dan tugas cleaner. Tanpa waktu mulai/durasi valid, hasilnya `null`.
- `POST /api/tracking/work-duration`: memakai `scheduledDurationMinutes` atau `sopBaseMinutes`. Input lama seperti kondisi/jumlah cleaner tetap divalidasi jika dikirim, tetapi tidak dipakai sebagai pengali durasi yang belum disepakati. Ini endpoint kalkulator, bukan otoritas perubahan harga.
- Booking dan tugas yang dibaca dari database menggunakan durasi katalog layanan dan waktu mulai tugas; tidak mempercayakan nilai bisnis pada LLM.
- Waktu mulai MySQL dibaca sebagai Unix milliseconds sebelum diserialisasikan ke ISO. Ini menghindari selisih 7 jam yang terdeteksi dari interpretasi `DATETIME` lokal oleh driver berzona UTC, tanpa mengubah zona waktu server atau isi tabel.
- Flutter meneruskan durasi numerik dari katalog/cache/booking dan menampilkan perkiraan saat sedang dikerjakan. Jika waktu perkiraan lewat, tunggu konfirmasi cleaner; pesanan tidak otomatis selesai.
- Halaman tugas web menampilkan perkiraan selesai bila field tersedia dari backend. Tampilan tracking menampilkan rute OSRM, bukan “Model ML”.

Keterbatasan: durasi yang dibaca saat ini mengikuti katalog, belum snapshot durasi booking yang immutable. Jangan mengubah SOP layanan aktif secara sembarangan ketika masih ada pekerjaan berjalan. Sinkronisasi GPS/status/tautan dashboard yang masih parsial harus diuji end-to-end terpisah; tidak dibuat lengkap dengan data dummy baru pada revisi ini.

## 4. Kode lama dan cara menjalankan

Tiga pemanggil ML TypeScript `ai-eta.ts`, `ai-risk.ts`, dan `ai-work-duration.ts` dihapus setelah seluruh referensinya diganti. Cleanup lanjutan menghapus pipeline/training/inference Python, server Flask, pengujian khusus ML, contoh input, requirements, serta dua notebook yang hanya menjalankan script lama. Tidak ada pemanggil kode tersebut pada aplikasi aktif. Dataset, Joblib dan metrik tetap disimpan sebagai arsip; kode eksperimen dapat dilihat dari riwayat Git (contoh commit `bf0e66e`).

Jalankan MySQL/Laragon, Express, Next.js, dan Flutter seperti biasa. **Tidak perlu menyalakan server Python atau melakukan training.** Key Groq tetap hanya berada di `.env` backend; tidak dimasukkan ke mobile/web bundle. Variabel `AI_SERVICE_URL`/`AI_SERVICE_TOKEN` lama tidak dibaca lagi oleh backend aktif; `.env` lokal tidak ditimpa.

Revisi ini tidak mengubah database, tarif, data pengguna, dependensi, atau melakukan commit/push otomatis. Keterbatasan LLM, layanan rute publik, dan integrasi yang belum selesai tetap perlu diuji sebelum deployment.

## 5. Penyelarasan PRD bagian 13 — 25 Oktober 2026

Booking server Flutter kini memakai `GET /api/customer/bookings/:id/tracking` dengan token customer. Query `findCustomerTask` membatasi customer dan ID booking sebelum membaca koordinat. Backend memakai GPS assignment dan alamat booking; tidak menerima posisi demo dari pelanggan. GPS kosong/usang ≥5 menit atau tahap belum berangkat tidak menghasilkan ETA baru. Hasil OSRM menyertakan waktu hitung, waktu GPS dan perkiraan tiba. Halaman status melakukan refresh 30 detik hanya saat aktif.

`publicTask` mengeluarkan GPS tersimpan dengan timestamp. Dashboard menerima format board `data.items` yang sekarang disediakan Backend serta array lama untuk kompatibilitas. Angka menit dibulatkan ke atas; respons request yang sudah dibatalkan tidak boleh menimpa pilihan lain.

Timestamp mulai tidak ditulis ulang saat aksi tiba diulang; penyimpanan SQL tahap diperbaiki agar jumlah parameter sesuai placeholder. Pelanggan pada booking server tidak dapat mengubah tahap melalui timeline atau menggeser cleaner memakai kontrol demo.

Belum diterapkan menyeluruh: notifikasi semua event, deduplikasi persisten/push, snapshot SOP, penyelarasan dispatch/link, tindak lanjut admin dan UAT langsung. Status ini tidak berarti seluruh kartu Trello sudah selesai. Model/dataset arsip tidak digunakan; Python tetap tidak perlu dijalankan.
