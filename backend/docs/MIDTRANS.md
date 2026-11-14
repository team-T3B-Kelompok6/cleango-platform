# Midtrans Snap Redirect

Checkout digital baru memakai Midtrans Snap khusus QRIS. Backend memakai native `fetch` dan `node:crypto`; tidak menambah SDK. Flutter menampilkan checkout HTTPS dalam WebView aplikasi, dengan opsi browser manual jika diperlukan. QRIS dan cash tersedia; pembuatan checkout GoPay/DANA ditolak. Transaksi legacy non-Midtrans memerlukan rekonsiliasi manual admin; tidak ada runtime gateway lama.

## Konfigurasi backend/.env

```dotenv
MIDTRANS_SERVER_KEY=<Server Key Sandbox>
MIDTRANS_CLIENT_KEY=<Client Key Sandbox>
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_NOTIFICATION_URL=https://<domain-publik-asli>/api/payments/webhook/midtrans
```

Ganti placeholder domain dengan URL HTTPS asli, bukan teks dalam tanda `< >`. Restart backend setelah perubahan. Client Key tidak diperlukan untuk Snap Redirect server-side; disimpan untuk kompatibilitas konfigurasi, tidak dikirim ke Flutter. Jangan commit Server Key atau membagikannya di log/chat.

Atur Payment Notification URL di Dashboard Midtrans Sandbox ke URL yang sama. Backend juga memakai `X-Override-Notification` jika variabel URL terisi. Jika variabel kosong, Midtrans memakai konfigurasi Dashboard. Untuk backend lokal perlu tunnel HTTPS ke port backend (default 3001).

QRIS aplikasi dipetakan ke Snap `enabled_payments: ["other_qris"]`, bukan `["qris"]`. `other_qris` menampilkan QRIS generik di checkout, termasuk layar mobile. Core API berbeda: pembuatan charge QRIS memakai `payment_type: "qris"`; backend ini membuat sesi Snap, bukan charge Core.

Pastikan channel GoPay QRIS atau ShopeePay QRIS sudah aktif pada akun dan mode Sandbox/Production yang dipakai, lalu konfigurasi Other QRIS di Snap Settings sesuai dokumentasi Midtrans. Jika keduanya aktif, Midtrans memakai GoPay sebagai acquirer default. `enabled_payments` tidak mengaktifkan channel merchant. Backend hanya menerima `qris`/`cash` untuk pembayaran baru; `other_qris` tetap dapat diproses melalui acquirer GoPay/ShopeePay tanpa menampilkan metode dompet terpisah.

## Endpoint

- `POST /api/customer/bookings/:id/pay` dengan autentikasi pelanggan dan body `{"method":"qris"}`. Nominal berasal dari database. Respons booking di `data`; `payment` berisi `status`, `checkoutUrl`, `expiresAt` (dapat null).
- `GET /api/customer/bookings/:id`: untuk pembayaran digital yang belum lunas, backend membaca status provider dan merekonsiliasi transaksi sebelum mengembalikan booking. Tombol Cek Status Flutter memakai endpoint ini; tidak membuat transaksi baru. Webhook tetap diperlukan untuk pembaruan saat aplikasi ditutup.
- `POST /api/payments/webhook/midtrans`: verifikasi SHA-512 `order_id + status_code + gross_amount + ServerKey` dengan perbandingan constant-time. Baca ulang status ke Midtrans; cocokkan reference dan nominal sebelum settlement database.
- Endpoint Xendit (`/api/payments/webhook`) dan modul runtime Xendit telah dihapus penuh; backend kini eksklusif Midtrans.
- Penanganan sesi legacy (`cg-%`): Database lokal mencatat 1 sesi aktif legacy (`cg-%`). Sesi legacy tidak dimigrasi otomatis dan tidak dihapus/diubah di DB. Segala upaya charge baru, cash, atau refresh pada booking dengan sesi legacy aktif/creating/unknown/completed diblokir secara fail-closed (HTTP 409 `PAYMENT_SESSION_CONFLICT` meminta hubungi admin) untuk mencegah tagihan ganda. Sesi legacy aktif ini membutuhkan rekonsiliasi manual langsung oleh admin via dashboard sebelum ditindaklanjuti.

Status `settlement` dan `capture` dengan fraud `accept` dianggap paid. Pending/deny/challenge tidak melunasi pesanan. Cancel/expire menjadi expired. Refund perlu rekonsiliasi admin; bukan auto-refund lokal. Callback duplikat tidak mengulang notifikasi/redeem promo.

Snap dapat membalas status 404 sebelum pelanggan memilih metode bayar. Aplikasi memakai checkout URL tersimpan, tidak membuat tagihan kedua. Timeout pembuatan sesi meninggalkan reservation unknown agar retry tidak membuat tagihan ganda. Periksa order di Dashboard sebelum penanganan manual; jangan hapus reservation tanpa rekonsiliasi.

Skema `payment_sessions` yang sudah ada tetap digunakan; migrasi ini tidak menghapus data atau menjalankan seeder. Deadline checkout ditampilkan Midtrans; `expiresAt` null sampai timestamp provider didukung eksplisit. Tidak ada auto-cancel/refund/rekonsiliasi terjadwal.

## Verifikasi penghapusan gateway lama — 13 November 2026

- Regresi ditulis sebelum perubahan runtime: legacy aktif dan completed terbukti belum aman (charge/cash/refresh); pengujian awal gagal sesuai harapan.
- Suite payment akhir: **96 PASS, 3 SKIP** (7 file; DB integration sengaja tidak dijalankan). Mencakup legacy active/creating/unknown/completed, blokir cash dan charge, sesi lama di belakang sesi lebih baru, refresh tanpa jaringan/mutasi, webhook lama HTTP 404, dan verifikasi Midtrans yang tetap otoritatif.
- `npm run typecheck` dan `npm run build`: **PASS**.
- Checkpoint payment paralel sempat mencatat kegagalan tes foto/kategori yang sedang direvisi. Rerun parent setelah integrasi perubahan foto/admin: `npm test` **999 PASS, 61 SKIP**; typecheck/build backend PASS. Tes mock/regresi ini bukan bukti transaksi gateway nyata.
- Tidak ada mutasi database, transaksi gateway nyata, perubahan `.env`, penghapusan reservation, atau migrasi referensi otomatis. Vault diperbarui oleh sesi induk; hasil ini bukan bukti UAT gateway/DB.

## Uji Sandbox

1. Ganti key yang pernah terekspos dan pastikan mode Sandbox.
2. Isi domain webhook asli, restart backend, pastikan HP dapat menjangkau API.
3. Buat booking baru, pilih QRIS, buka checkout Midtrans.
4. Gunakan simulator Sandbox Midtrans, bukan uang nyata. Pastikan pembayaran menjadi paid melalui webhook/status server.
5. Uji pending, expire/cancel, callback signature salah, duplikat, dan nominal tidak cocok sebelum Production.

Tes mock tidak membuat transaksi live atau mengubah DB. Jangan jalankan charge live atau mutasi DB untuk verifikasi konfigurasi; gunakan mock tests atau Sandbox. Jangan pernah mencetak Server Key/signature credentials ke log. Untuk menjalankan tes sebelum domain tunnel tersedia, set URL dummy hanya di proses tes:

```powershell
$env:RUN_DB_TESTS='0'
$env:MIDTRANS_NOTIFICATION_URL='https://example.test/api/payments/webhook/midtrans'
npm run typecheck --workspace backend
npm test --workspace backend -- tests/midtrans.test.ts
```

Referensi: https://docs.midtrans.com/reference/other-qris , https://docs.midtrans.com/docs/gopay-qris-pos-integration , https://docs.midtrans.com/reference/request-body-json-parameter , https://docs.midtrans.com/reference/json-objects , https://github.com/Midtrans/midtrans-nodejs-client .
