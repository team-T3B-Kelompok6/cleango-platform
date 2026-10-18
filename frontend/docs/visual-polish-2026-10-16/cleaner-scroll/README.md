# Tombol keberangkatan mengikuti form

Tombol **Berangkat Sekarang** kini berada dalam alur halaman, setelah bagian Perjalanan Pesanan. Area tombol ikut bergulir bersama isi dan menggunakan margin yang sama dengan kartu form, termasuk pada layar HP. Ruang bawah yang semula disediakan untuk footer fixed juga dikurangi pada tahap Siap Berangkat.

Perubahan terbatas pada `app/cleaner.css`. Format CSS lolos. Pengujian browser mencakup modal admin, halaman langsung desktop 1280 × 720, dan HP 390 × 844: [hasil](checks.json), [tampilan HP](phone.jpg). Pada ketiga konteks, posisi footer static, lebar sejajar kartu, tombol bergerak bersama scroll, dan tidak menimpa bagian perjalanan. Pengujian hanya membaca serta menggulir halaman, tanpa menekan aksi keberangkatan atau mengubah progres tugas.
