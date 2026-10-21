# Boo — pemeriksaan keamanan dan cakupan pengetahuan

Tanggal: 18 Oktober 2026. Scope: endpoint chatbot, pemanggilan Groq, sumber
pengetahuan, dan penyimpanan riwayat Flutter. Bukan audit keamanan seluruh backend,
pentest, atau sertifikasi production-ready. Tidak ada commit/push atau perubahan DB.

Pembaruan setelah laporan awal: pengguna meminta akses baca diaktifkan. Konfigurasi
lokal sekarang `CHATBOT_DATABASE_ENABLED=true`, sementara default/template tetap
false. Knowledge dan sumber database dipakai bersama; kontrol ownership serta
larangan akses tulis tidak berubah. 138 test backend dan uji MySQL/Groq lokal
lulus. Saran "biarkan OFF" di bagian risiko awal adalah rekomendasi konservatif
sebelum aktivasi, bukan gambaran konfigurasi lokal saat ini. Auth/order pada HP
dan kesiapan produksi tetap belum disahkan.

## Ringkasan

Mode default `CHATBOT_DATABASE_ENABLED=false` memisahkan panduan CleanGo dari data
operasional yang belum siap. Dua puluh topik disusun dari PRD dan konsep smart;
fitur yang direncanakan tidak dipresentasikan sebagai integrasi aktif. Pertanyaan
yang belum memiliki sumber dijawab dengan keterbatasan atau permintaan klarifikasi.
LLM tidak memiliki tools SQL, file, shell, pemesanan, pembayaran, atau pengiriman pesan.

## Temuan dan perbaikan terverifikasi

### SEC-01 — MEDIUM — batas input riwayat terlalu longgar — FIXED

- Lokasi: `backend/src/controller/chatbot.controller.ts:22`, `:36`.
- Bukti sebelumnya: role diperiksa dengan `String(item.role)` sehingga array berisi
  `user` ikut lolos. Field tambahan pada entry history dan pesan kosong tidak ditolak.
- Dampak: format di luar kontrak lolos ke lapisan bisnis; bukan bukti akses akun lain.
- Perbaikan: tipe objek/array dan role string diperiksa eksplisit; allowlist role/content;
  konten harus nonblank dan berukuran terbatas. Pengujian endpoint mengharapkan 400.

### SEC-02 — MEDIUM — redaksi informasi sensitif belum cukup — IMPROVED

- Lokasi: `backend/src/lib/groq-chat.ts:45`; `backend/src/lib/chatbot.ts:131`.
- Bukti: redaksi awal belum mencakup bare JWT, nomor identitas panjang, atau password
  pada history. Uji baru menemukan pola `password saya: ...` sempat menyisakan nilainya;
  akar pola redaksi tersebut sudah diperbaiki dan diuji ulang.
- Perbaikan: guard input sebelum provider, normalisasi whitespace/karakter tak terlihat,
  redaksi tambahan untuk history, dan prompt tidak meminta informasi sensitif.
- Batas: regex tidak mengenali semua nama/alamat bebas atau format penyamaran.
  Pelanggan tetap harus diingatkan tidak mengirim rahasia. Ini mitigasi, bukan DLP lengkap.

### SEC-03 — MEDIUM — klaim model dapat melampaui kemampuan nyata — IMPROVED

- Lokasi: `backend/src/lib/chatbot-knowledge.ts:3`, `:181`;
  `backend/src/lib/groq-chat.ts:17`, `:179`.
- Bukti: pengecekan sebelumnya terutama menolak angka dan klaim tindakan selesai,
  belum menolak tawaran seperti "Saya dapat membatalkan pesanan". Angka kelompok
  dalam sumber juga bisa salah dianggap mendukung nilai harga.
- Perbaikan: daftar kemampuan deterministik, penolakan tindakan langsung, prompt
  hanya memberi panduan, guard terhadap beberapa pola klaim tindakan/identitas salah,
  validasi harga terpisah dari angka umum, serta penolakan email/telepon dan permintaan
  data sensitif dari output model. Output gagal memakai sumber lokal.
- Batas: pemeriksaan teks bukan pembuktian bahwa seluruh isi jawaban didukung sumber.
  Tidak ada akses tulis model, sehingga klaim tidak mengeksekusi tindakan.

### SEC-04 — LOW — riwayat tersembunyi tetapi tertinggal setelah logout — FIXED

- Lokasi: `cleango_app/lib/core/storage/token_storage.dart:69`;
  `cleango_app/lib/features/chatbot/data/chat_history_store.dart:57`.
- Bukti: sebelumnya clearSession hanya menghapus token/expiry, bukan blob riwayat.
- Perbaikan: logout/pembersihan sesi ikut menghapus key riwayat Boo. Key didefinisikan
  sekali dan dipakai store serta pembersihan sesi. Pengujian adapter secure storage lulus.
- Dampak perilaku: riwayat sesi tidak dapat dipulihkan setelah logout. Ini belum
  penyimpanan riwayat per akun/server. Penghapusan pada HP dan race logout vs request
  berjalan belum diuji end-to-end; tidak diklaim atomic.

### SEC-05 — LOW — outbound provider mengikuti redirect default — HARDENED

- Lokasi: `backend/src/lib/groq-chat.ts:89`.
- Bukti: fetch sebelumnya memakai redirect default. Tujuan URL sudah tetap, bukan
  URL masukan pelanggan; tidak ditemukan bukti SSRF lewat URL pelanggan.
- Perbaikan: `redirect: 'error'` dan timeout tetap dibatasi. Uji memeriksa opsinya.

## Kontrol yang dipertahankan

- API key hanya di backend; tidak dibaca/ditampilkan dalam laporan atau log respons.
- Auth tetap memverifikasi token yang dikirim. Identitas customer tidak diambil dari body.
- Mode database OFF tidak memanggil model SQL, termasuk untuk customer yang sudah login.
- Mode database ON tetap memakai ownership `customer_id = ?`; pesanan pribadi tidak ke LLM.
- Riwayat assistant dari klien bukan pengetahuan resmi. Sumber bersifat data, bukan instruksi.
- Tidak menjalankan kode, URL pelanggan, SQL, atau perubahan status dari jawaban model.
- Endpoint membatasi sepuluh request/menit/IP; fallback provider maksimal tiga model.
- Flutter menampilkan jawaban sebagai Text, bukan HTML aktif atau link yang otomatis dibuka.

## Bukti pengujian

- `npm run typecheck --workspace backend`: PASS.
- `npm run test --workspace backend`: 138 PASS; SQL/provider memakai mock.
- `flutter analyze`: PASS, no issues.
- `flutter test`: 138 PASS; termasuk storage/logout dan widget/repository chatbot.
- `npm run chat:check --workspace backend -- --knowledge`: tujuh skenario selesai;
  empat jawaban LLM primary berhasil, tiga guard/capability deterministik.
- Format Dart/Prettier dan pemeriksaan Git diff dilakukan pada scope perubahan.
- Tidak menjalankan migration/seeder, menulis database, melatih model, atau menambah dependency.

## Risiko yang masih ada dan langkah sebelum publik

1. MEDIUM: kemungkinan halusinasi/prompt injection tetap ada; uji bahasa Indonesia,
   parafrasa, konteks panjang, dan adversarial perlu diperluas. Jangan menjanjikan jawaban apa pun.
2. MEDIUM: data yang lolos redaksi dikirim ke provider eksternal. Tentukan pemberitahuan
   privasi, persetujuan/dasar pemrosesan, dan kebijakan retensi sebelum peluncuran publik.
3. MEDIUM: limiter hanya per proses/IP. Deployment multi-instance, proxy, abuse biaya,
   concurrency, dan batas anggaran provider belum diuji; perlu kontrol operasional di lingkungan tujuan.
4. MEDIUM: auth/order/promo/catalogue E2E dan kualitas data operasional belum disahkan.
   Biarkan mode database OFF. Jangan mengaktifkan hanya agar demo tampak selesai.
5. LOW: riwayat hanya lokal dan terikat token sesi; pergantian token dapat membuat
   riwayat tidak tampil. Review penggunaan identifier akun non-secret ketika auth final siap.
6. UNVERIFIED: HTTPS/proxy, konfigurasi produksi, perangkat fisik, penyimpanan native,
   load test, build APK, serta kualitas kedua model cadangan secara langsung.

Panduan `security-best-practices` dipakai untuk validasi boundary, redaksi,
least privilege, batas outbound request dan pelaporan ketidakpastian. Pemeriksaan
ini tidak mengubah konfigurasi deployment maupun layanan produksi.
