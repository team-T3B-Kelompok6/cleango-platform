# Boo — perbaikan typo, relevansi, fallback, dan batas keamanan

Tanggal: 21 Oktober 2026. Repository: `express-next-app`, branch `feature/ai-chatbot`.

## Hasil dan batas scope

Perubahan memperbaiki alur pesan dari Flutter ke chatbot Express dan Groq. Tidak
mengubah desain, kode mobile, frontend, schema/data database, konfigurasi lokal,
dependency, dataset, atau artefak model. Tidak melakukan training, commit, atau push.
Perubahan README, `frontend/next-env.d.ts`, serta dokumen AI-04 lain yang sudah ada
sebelum pekerjaan ini dipertahankan, bukan dianggap hasil perbaikan ini.

Tidak ada jaminan bahwa seluruh kemungkinan bahasa/typo sudah dikenali. Pesan
ambigu atau sumber yang tidak cukup harus menghasilkan klarifikasi, bukan tebakan.

## Temuan yang diperbaiki

| ID     | Severity | Masalah                                                                                                                             | Perbaikan                                                                                                                                                                                                                                     |
| ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BOO-01 | MEDIUM   | Pola `ai\b` menganggap akhiran `bhai`, `mulai`, dan `santai` sebagai AI/ETA. Potongan kata lain juga bisa memicu topik yang keliru. | Pencocokan kata utuh dengan batas huruf/angka Unicode; pertanyaan tentang AI sendiri dipisahkan dari penjelasan ETA.                                                                                                                          |
| BOO-02 | MEDIUM   | Typo dan bahasa santai tidak konsisten antara pemilihan knowledge, katalog, dan konteks.                                            | Normalisasi bersama di `chatbot-text.ts`, memakai alias yang diketahui, bukan koreksi fuzzy bebas.                                                                                                                                            |
| BOO-03 | MEDIUM   | Pertanyaan harga/durasi tanpa nama layanan dapat menghasilkan jawaban umum atau katalog yang tidak dimaksud.                        | Minta nama layanan; konteks hanya dibawa untuk pertanyaan lanjutan, bukan topik baru.                                                                                                                                                         |
| BOO-04 | MEDIUM   | Kata umum `cuci` dan kategori gabungan dapat membuat motor dijawab sebagai AC, atau kasur dijawab sebagai sofa.                     | Cocokkan objek layanan spesifik dengan nama layanan aktif; kategori saja tidak membuktikan layanan itu tersedia.                                                                                                                              |
| BOO-05 | MEDIUM   | Normalisasi karakter tersembunyi dapat membuat input kosong; NFKC dapat memperpanjang input setelah batas panjang diperiksa.        | Tolak pesan/history kosong atau lebih dari 2.000 karakter setelah normalisasi juga.                                                                                                                                                           |
| BOO-06 | LOW      | Fallback gabungan bisa melebihi 2.500 karakter sehingga tidak sesuai batas pemulihan riwayat Flutter.                               | Batasi jawaban fallback dan berikan arahan membaca detail di aplikasi.                                                                                                                                                                        |
| BOO-07 | MEDIUM   | Model bisa menyebut data tidak ada padahal koneksi belum aktif atau gagal.                                                          | Pernyataan ketersediaan data penting dijawab langsung dari sumber backend, tanpa parafrasa LLM.                                                                                                                                               |
| BOO-08 | LOW      | Deskripsi promo yang panjang bisa memotong syarat di akhir konteks.                                                                 | Letakkan diskon, batas, minimum transaksi, periode, dan validasi checkout sebelum deskripsi.                                                                                                                                                  |
| BOO-09 | LOW      | Kegagalan fitur/schema pada satu model menghentikan fallback.                                                                       | Respons provider 400/422 juga dapat mencoba model berikutnya; 401/403 tetap berhenti. Maksimal tiga percobaan.                                                                                                                                |
| BOO-10 | MEDIUM   | Panduan booking/pembayaran yang menyebut kata layanan malah meminta nama paket.                                                     | Panduan umum tidak bergantung pada pencocokan katalog. Fallback pembayaran tetap memakai petunjuk pembayaran, bukan langkah booking.                                                                                                          |
| BOO-11 | MEDIUM   | Pertanyaan harga + promo kehilangan salah satu bagian saat fallback; deskripsi panjang dapat menutupi syarat.                       | Susun bagian harga, promo, dan panduan secara terpisah. Gunakan ringkasan harga/durasi dan syarat promo; harga + promo dijawab langsung oleh backend.                                                                                         |
| BOO-12 | HIGH     | Klaim refund gratis dapat lolos meskipun sumber menyatakan aturan belum tersedia.                                                   | Pertanyaan kebijakan tidak digenerasikan LLM. Jawab dari FAQ terpublikasi yang judulnya cocok dengan topik, atau jelaskan aturan yang belum dipastikan. Tolak pula penyebutan kebijakan spesifik yang muncul tanpa diminta pada output model. |
| BOO-13 | LOW      | Klarifikasi berulang dan nada terlalu teknis dapat membuat pengguna frustrasi.                                                      | Persingkat klarifikasi, buat panduan booking mudah diikuti, dan arahkan prompt agar tenang, ramah, tidak menyalahkan typo, serta menjawab tiap bagian pertanyaan.                                                                             |

Lokasi implementasi: `backend/src/lib/chatbot-text.ts`, `chatbot-knowledge.ts`,
`chatbot.ts`, `groq-chat.ts`, dan `backend/src/controller/chatbot.controller.ts`.

## Cara kerja setelah perbaikan

1. Flutter tetap mengirim pesan asli, maksimal delapan pesan konteks, serta JWT
   server jika tersedia. UI dan kontrak endpoint tidak berubah.
2. Controller memvalidasi bentuk, tipe, field, panjang, dan hasil normalisasi Unicode.
3. Backend memeriksa pesan asli dan versi pencarian terhadap guard keamanan.
4. Sapaan/ucapan terima kasih ditangani langsung tanpa database atau LLM.
5. Alias typo hanya digunakan untuk pencarian dan penentuan maksud. Pesan asli
   tetap dipakai ketika mengambil nomor pesanan dan membentuk pertanyaan ke LLM.
6. Pesanan pribadi harus memakai identitas dari JWT dan query ownership yang sudah
   ada; tidak memakai ID customer dari body dan tidak mengirim hasil pesanan ke Groq.
7. Pertanyaan umum memilih knowledge/FAQ/katalog/promo yang relevan. Pencarian kata
   memakai token utuh. Token sumber dihitung sekali per sumber ketika diberi skor.
8. Pesan tidak jelas meminta klarifikasi. Katalog yang belum terhubung/gagal dibaca
   dibedakan dari layanan yang memang tidak ditemukan.
9. Untuk refund, pembatalan, perubahan jadwal, dan garansi, backend mengutip FAQ
   resmi yang relevan tanpa parafrasa model. FAQ garansi tidak dianggap bukti
   refund; judul generik "Ketentuan CleanGo" tidak membuktikan semua aturan.
   Jika sebagian topik belum tersedia, ketidakpastian hanya disebut untuk bagian itu.
10. Untuk jawaban generatif, Groq menerima sumber server terpilih. Guard angka,
    harga, source ID, data sensitif, dan klaim tindakan tetap dipertahankan.
11. Jika model gagal/tidak memenuhi pemeriksaan, backend memakai fallback terbatas
    dan relevan. Jawaban kembali sebagai teks biasa untuk bubble Flutter.

## Contoh perilaku yang diuji

- `bhai`, `haii`, `hallo boo`, `helo kak`, dan sapaan waktu: menyapa, bukan ETA.
- `gmn cara boking?`: panduan booking.
- `hrga deep clening brp?`: mencari Deep Cleaning; tidak menggantinya dengan Basic.
- `hrga cuci ac?`: token AC tetap dikenali meskipun hanya dua huruf.
- `cuci motor` tanpa layanan motor: mengakui belum tersedia, bukan harga AC.
- `cuci kasur` dengan katalog hanya Sofa Cleaning: tidak menyamakan keduanya.
- `harga?` tanpa konteks: meminta nama layanan.
- `brp lama?` setelah membahas suatu layanan: mempertahankan layanan tersebut.
- Pergantian topik dari pesanan ke promo: tidak memakai riwayat sebagai alasan
  membuka data pesanan. Referensi voucher tidak otomatis dianggap ID booking.
- `asdfgh`, tanda baca saja, atau pesan ambigu: klarifikasi tanpa panggilan Groq.
- Typo pada upaya membuka prompt, membocorkan secret, atau meminta pelanggan lain:
  guard tetap diperiksa; typo tidak memberi hak akses baru.
- Nomor pesanan, nominal, dan nama layanan yang tidak dikenal tidak dikoreksi bebas.

## Verifikasi

### Pemisahan sumber bisnis — 21 Oktober 2026

- Harga/durasi/cakupan/ketersediaan hanya dari tabel layanan; promo hanya dari
  tabel promo; pesanan/pembayaran hanya dari query dengan validasi ownership.
- FAQ harga/promo lama tidak masuk konteks LLM untuk menggantikan nilai tabel.
  Pertanyaan bisnis tidak memakai ringkasan statis layanan/harga/promo/kebijakan.
- FAQ terpublikasi yang relevan menggantikan knowledge pada topik panduan yang sama.
  Daftar contoh metode pembayaran dihapus dari panduan statis agar tidak dianggap
  metode aktif. Tidak ada schema/data, konfigurasi, dependency, atau kontrak API yang diubah.
- Data kosong, gagal dibaca, dan integrasi OFF tetap dibedakan; ketidaktersediaan
  kebijakan memakai metadata `availability:policy`, bukan klaim dari knowledge.

Verifikasi perubahan pemisahan sumber: **287 tes backend PASS** pada 13 file
(database/provider mock), TypeScript dan format PASS. Tambahan 15 kasus mencakup
FAQ lama vs katalog/promo aktif/kosong/gagal, integrasi OFF, prioritas FAQ panduan,
kebijakan kosong/gagal, dan harga yang berubah pada query berikutnya.
Tes HTTP Flutter → Express terisolasi juga PASS: lima pertukaran pesan serta
penyimpanan jawaban pada test history store, database/Groq OFF hanya pada proses uji.
Kode produksi mobile tidak berubah dalam perubahan pemisahan sumber ini.
Tidak menguji MySQL operasional, Groq asli, atau HP fisik pada perubahan ini.
Hasil pengujian historis di bawah tidak menyatakan kondisi database sekarang.

| Pemeriksaan                                                          | Hasil                                                                                                                             |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript backend (`tsc --noEmit`)                                  | PASS                                                                                                                              |
| Seluruh unit/integration test backend, SQL dan provider memakai mock | 272 PASS pada 13 file test setelah perbaikan BOO-10–13                                                                            |
| Flutter analyze                                                      | PASS pada pemeriksaan sebelumnya, tidak diulang pada perubahan backend ini                                                        |
| Seluruh unit/widget test Flutter pada checkout saat pemeriksaan awal | 178 PASS pada pemeriksaan sebelumnya                                                                                              |
| Uji ulang Boo, Pusat Bantuan, dan navigasi setelah perbaikan backend | 33 PASS; kode mobile tidak berubah                                                                                                |
| Format Prettier pada file chatbot yang disentuh                      | PASS                                                                                                                              |
| Git diff whitespace                                                  | PASS                                                                                                                              |
| Syntax Python AI, tanpa mengeksekusi training                        | PASS, 11 file                                                                                                                     |
| Tes Python AI                                                        | 11 tes feature/pipeline lulus; 9 tes service/durasi BLOCKED karena Flask/Joblib belum tersedia pada runtime Python yang diperiksa |

Uji koneksi Groq asli dilakukan pada pertanyaan umum dalam mode database OFF,
tanpa data pelanggan. Sapaan dan input tidak jelas memakai jawaban langsung.
`gmn cara boking?` berhasil dijawab primary `openai/gpt-oss-20b`; pengukuran saat
percobaan sekitar 0,4–1,0 detik, bukan SLA atau benchmark beban. Pada uji awal,
pertanyaan keterlambatan typo juga dijawab Groq. Temuan salah parafrasa ketersediaan
harga pada uji awal ditutup dengan respons backend deterministik dan tes regresi.
Mode database ON diuji dengan SQL mock, termasuk ownership dan data gagal diakses;
tidak melakukan perubahan database operasional.

### Verifikasi ulang BOO-10–13

Delapan belas kasus regresi pertama gagal sebelum perbaikan dan lulus setelahnya.
Ditambah pengujian lanjutan, jumlah tes backend bertambah dari 247 menjadi 272.
Kasus mencakup katalog kosong/gagal, promo aktif/kosong/gagal, harga + promo,
deskripsi panjang, FAQ kebijakan yang relevan/tidak relevan, kebijakan yang hanya
sebagian tersedia, dan output provider tiruan yang mengarang refund gratis.

Groq nyata pada mode database OFF menjawab panduan booking, pembayaran, dan pesan
pengguna kesal secara relevan tanpa menyalahkan pengguna. Ketiganya memakai model
utama; latency contoh 715–1918 ms, bukan benchmark atau jaminan performa.
Sapaan, kebijakan refund yang belum tersedia, serta status katalog/promo pending
dijawab langsung. Pemeriksaan `npm run chat:check` kini memeriksa dua pertanyaan
provider (harga/durasi dan promo fiktif), keduanya PASS. Refund dipindahkan ke alur
pengetahuan/tes deterministik agar tidak salah dianggap kegagalan provider.

Database aktual belum terverifikasi pada perbaikan ini; koneksi MySQL terakhir
sebelumnya menolak koneksi (`ECONNREFUSED`). Jangan menganggap uji mock sebagai
bukti katalog, autentikasi, atau pesanan pelanggan nyata sudah terintegrasi.

## Risiko dan pekerjaan yang masih tersisa

- Alias bukan pemahaman semua bahasa. Typo baru, slang lokal, serta multi-intent
  kompleks dapat meminta klarifikasi atau belum terjawab lengkap.
- Prompt/regex/source ID tidak membuktikan seluruh kalimat LLM benar. Tetap perlu
  evaluasi percakapan nyata yang dianonimkan dan pengawasan informasi bisnis.
- Minimisasi data berbasis pola bukan DLP lengkap. Pengguna jangan mengirim secret,
  identitas, alamat lengkap, atau data pembayaran yang tidak dibutuhkan.
- Limiter masih per IP/proses. Proxy, multi-instance, batas biaya, beban tinggi,
  query database lambat, dan deployment publik belum disahkan.
- Login mobile yang masih berupa sesi lokal bukan JWT backend. Akses pesanan
  pribadi dari HP tetap menunggu integrasi akun/booking server yang lengkap.
- Tidak menguji ulang seluruh skenario pada HP fisik, build APK/web, atau dua
  model cadangan dengan provider asli. Fallback provider diuji dengan mock.
- Model ETA/risiko/durasi Python tidak berubah dan tidak dilatih ulang. Catatan
  data simulasi, leakage validasi, kualitas prediksi, dan kesiapan produksi dari
  audit sebelumnya tetap berlaku; lolos tes chatbot tidak menutup masalah tersebut.
- Runtime Python perlu disiapkan menggunakan dependency proyek yang sesuai
  sebelum pengujian service/durasi dapat dinyatakan lulus ulang.

Panduan `security-best-practices` digunakan untuk batas input, pemisahan data
tidak tepercaya, ownership server, minimisasi data, dan outbound request terbatas.
Ini perbaikan teruji untuk chatbot, bukan pentest atau sertifikasi keamanan produksi.
