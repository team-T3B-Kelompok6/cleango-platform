# Popup detail — 15 Oktober 2026

Semua detail kembali tampil sebagai popup di atas daftar. Sumber visual memakai screenshot Figma yang diberikan; tool Figma masih menolak akses edit file. Ukuran diperkirakan dari screenshot dan disesuaikan dengan font serta token proyek.

| Menu     | Popup                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------- |
| Pesanan  | Detail & Ubah, identitas pemesan, rincian pesanan, penugasan kru, catatan, pembatalan dan simpan          |
| Jadwal   | Detail & Ubah Jadwal Shift Pekerja, ringkasan kru, pilihan shift, tanggal/jam, status dan pesanan terkait |
| Layanan  | Pratinjau foto/deskripsi/fasilitas/harga, lalu editor foto dan harga pada popup yang sama                 |
| Customer | Ringkasan transaksi, kontak, alamat, layanan/kru langganan, catatan, riwayat, WhatsApp dan edit           |
| FAQ      | Kategori/publikasi, kartu pertanyaan dan jawaban, metadata pembaca/pembaruan, tips, lalu edit             |
| Petugas  | Profil, keahlian, tugas aktif, WhatsApp/salin tautan dan edit yang sudah dibuat sebelumnya                |

Tutup, X, Batal, dan Escape menutup popup; Batal pada tahap edit ringkasan kembali ke pratinjau. Header/footer tetap terlihat dan isi bergulir. Pencarian, filter, dan pagination daftar dipertahankan. Perapihan visual selanjutnya harus mempertahankan pola popup ini.

## Verifikasi

- Keenam tombol Detail diuji dari daftar, serta URL detail dibuka langsung.
- 24 kombinasi menu × viewport: 1280×900, 768×1024, 360×800, dan 800×360. Seluruh dialog masuk layar, tanpa luapan horizontal dan tanpa tombol footer terpotong; lihat [hasil ukuran](responsive.json).
- Pesanan: validasi status tanpa petugas, pilihan kru, simpan catatan/penugasan, dan persiapan pembatalan sebelum simpan.
- Jadwal: ubah petugas, pilihan shift/jam, status, dan pembaruan daftar pesanan terhubung.
- FAQ, Customer, Layanan: buka pratinjau, masuk edit, Batal kembali ke pratinjau, lalu simpan.
- Tidak ada penumpukan dialog ketika berpindah pratinjau/edit. WhatsApp diuji melalui href tanpa mengirim pesan.
- Sembilan nilai hasil simpan pada lima resource diperiksa ulang melalui API preview; lihat [hasil interaksi](interactions.json). Data khusus uji sudah dihapus, data awal dipertahankan.
- Tutup detail FAQ dari halaman kedua mempertahankan pagination. Jalur kembali hanya mengizinkan daftar resource yang sama; URL luar/route resource lain ditolak.
- TypeScript, Prettier, dan build produksi diperiksa.

Perubahan hanya frontend. Kontrak jadwal masih berbasis booking; kuota, cuti/pelatihan per shift, auto-assign dan pengaturan roster yang terlihat di Figma memerlukan kontrak shift tersendiri dari tim. Status booking tidak diganti menjadi status kehadiran pekerja. Rating, catatan dan statistik yang belum tersedia tidak diisi angka contoh.

Bukti visual: [Pesanan](pesanan.png), [Jadwal](jadwal.png), [Layanan](layanan.png), [Customer](customer.png), [FAQ](faq.png), [Petugas](petugas.png).
