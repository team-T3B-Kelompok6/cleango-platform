# Pembayaran CleanGo: Xendit Payment Sessions

Integrasi memakai `POST https://api.xendit.co/sessions` dengan `session_type=PAY`, `mode=PAYMENT_LINK`, `IDR`, `ID`, dan automatic capture. Backend memakai native `fetch`; tidak perlu SDK baru. Cash tetap manual/pending sampai ditagih petugas.

## Konfigurasi

Isi **backend/.env** (jangan commit nilai rahasia):

```dotenv
XENDIT_SECRET_KEY=<secret API key Test Mode>
XENDIT_WEBHOOK_TOKEN=<verification token dari Dashboard Webhooks>
# Opsional: URL HTTPS milik sendiri. Tanpa ini, gunakan halaman akhir bawaan Xendit.
XENDIT_SUCCESS_RETURN_URL=
XENDIT_CANCEL_RETURN_URL=
```

Secret API key dan callback verification token berbeda. Jangan memakai API key sebagai callback token. Pisahkan key/token Test dan Live. Aktifkan QRIS/DANA/GoPay yang ingin dipakai pada akun Xendit dan izin API untuk Payment Sessions.

## Database

`payment-sessions.sql` menyimpan reservation sebelum request Xendit, ID provider, checkout URL, nominal, status, dan expiry. `scripts/apply-database.mjs` menyertakan file ini pada schema setup.

Untuk database yang sudah berisi data: backup, tinjau perubahan skema, lalu gunakan schema setup tanpa `--seed`. Jangan memakai seeder untuk upgrade database pengguna. Tidak ada migrasi otomatis saat server startup.

## Webhook lokal / production

Di Dashboard Xendit pada environment yang cocok, arahkan event **Payment Session completed / expired** ke:

```text
https://<HOST_BACKEND_PUBLIK>/api/payments/webhook
```

Lokal memerlukan tunnel HTTPS ke port backend (misalnya 3001). `localhost`, IP USB, dan `adb reverse` tidak bisa diakses server Xendit. Simpan verification token Dashboard sebagai `XENDIT_WEBHOOK_TOKEN`, kemudian restart backend.

Webhook memverifikasi `x-callback-token`, mengambil ulang sesi melalui API Xendit, mencocokkan referensi/ID/nominal, lalu memperbarui pembayaran dalam transaksi. Return URL dan tombol pelanggan bukan bukti pembayaran. Event duplikat tidak boleh menambah notifikasi atau redeem promo dua kali.

## Kontrak Flutter

```http
POST /api/customer/bookings/:id/pay
Authorization: Bearer <customer token>
Content-Type: application/json

{"method":"qris"}
```

Metode: `qris`, `dana`, `gopay`, `cash`. Jumlah tagihan berasal dari database; client tidak memilih nominal.

Respons mempertahankan `data` booking dan menambahkan:

```json
{"payment":{"status":"pending","checkoutUrl":"https://...","expiresAt":"2026-12-01T00:00:00Z"}}
```

Flutter membuka checkout melalui browser eksternal dan memeriksa status server setelah pengguna kembali. Status berhasil hanya bila backend menyatakan `paid`. Memanggil bayar lagi pada sesi aktif tidak membuat sesi kedua.

## Gangguan / rekonsiliasi

Jika koneksi putus setelah Xendit mungkin sudah membuat sesi, reservation berstatus `unknown`/`creating` diblokir dari pembuatan ulang. Ini sengaja mencegah tagihan ganda. Cari `reference_id` reservation di Dashboard Xendit, periksa status provider, dan kirim ulang webhook dari Dashboard bila sesi selesai/kedaluwarsa. Jangan hapus reservation atau mengubah pembayaran menjadi tunai tanpa memeriksa apakah sesi provider masih bisa dibayar.

Refund, auto-cancel sesi, rekonsiliasi terjadwal, dan auto-return deep link belum termasuk. Pembayaran yang masuk setelah booking dibatalkan perlu tindak lanjut admin; jangan otomatis menjalankan ulang booking atau menganggap refund sudah terjadi.

## Uji

Unit/mock tests tidak membuat tagihan Xendit atau mengubah database pengguna:

```powershell
$env:RUN_DB_TESTS='0'
npm run typecheck --workspace backend
npm test --workspace backend
```

Uji end-to-end terpisah memakai Test Mode: checkout sukses, tutup browser, expiry, callback token salah, callback berulang, nominal/reference tidak cocok, retry request, dan akses booking milik akun lain. Jangan lakukan transaksi Live sebelum seluruh jalur Test Mode dan webhook publik lolos.

Referensi resmi: https://docs.xendit.co/apidocs/create-session.md , https://docs.xendit.co/docs/payment-1.md , https://docs.xendit.co/docs/handling-webhooks.md .
