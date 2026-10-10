# Tracking petugas — preview simulasi

Permintaan pengguna 8 Oktober 2026: tambahkan tracking dummy di web admin dulu, pertahankan gaya Cleango/Figma dengan tampilan yang lebih sederhana. Frontend memakai Next.js App Router/RSC; hanya dialog dan peta yang menjadi Client Components. Skill setup-matt-pocock-skills sudah dikonfigurasi melalui AGENTS.md dan docs/agents/, sedangkan referensi desain mengikuti figma-design-to-code.

## Cara mencoba

1. Masuk ke menu Kelola Data Petugas, pilih **Pantau Petugas**. Petugas berstatus Bertugas juga memiliki **Lihat lokasi**. Profil petugas dan pesanan yang sudah ditugaskan menyediakan tombol tracking.
2. Pilih petugas dari daftar atau marker peta. Gunakan pencarian nama/wilayah dan filter status.
3. Lihat status, tujuan, contoh waktu pembaruan serta timeline penugasan hingga selesai. Lokasi yang terlambat ditandai tersendiri.
4. **Jalankan simulasi** memulai langkah dari penugasan dan memperbarui progres setiap 2,2 detik. **Jeda simulasi** menghentikan progres, **Reset** kembali ke langkah awal. Pergantian petugas menghentikan simulasi; penutupan dialog membuang state.

Footer tetap terlihat; hanya isi dialog yang scroll. Pilihan petugas dan perpindahan peta memakai transisi singkat. Reduced motion dihormati. Roster menjadi daftar horizontal pada layar kecil.

## Data dan batas preview

Lima skenario Jakarta disimpan di `lib/demo/tracking.ts`. Posisi dan waktu hanyalah contoh; tidak ada `navigator.geolocation`, koneksi lokasi mobile, polling API tracking atau perubahan data pesanan. Jika petugas dari API tidak mempunyai skenario, dialog menjelaskan bahwa contoh petugas sedang ditampilkan, tanpa menyalin nama atau kontaknya ke profil dummy.

Detail pesanan merujuk ID contoh. Keterkaitan dengan tugas aktual harus diganti ketika integrasi backend tersedia. Kontak WhatsApp memakai nomor contoh dari skenario; tombol hanya membuka link dan tidak mengirim pesan otomatis.

Peta memakai Leaflet 1.9.4 dan tile standar OpenStreetMap, dengan atribusi terlihat. Scroll roda mouse tidak mengubah zoom sehingga tidak mengganggu scroll dialog. Garis putus-putus hanya arah menuju lokasi, bukan rute jalan atau perhitungan ETA. Tombol Fokus petugas mengembalikan posisi pilihan ke tengah peta. Jika tile gagal, pesan dan tombol Coba lagi tetap tersedia; detail/timeline masih dapat dipakai.

Kebijakan sumber peta: [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/). QA otomatis mengintersepsi seluruh tile dengan fixture SVG agar tidak mengambil tile melalui bot; screenshot QA bukan bukti peta geografis sebenarnya.

## Integrasi nanti

API Express/mobile belum tersedia dan tidak dibangun dalam tugas frontend ini. Tim dapat menyepakati endpoint lokasi terbaru yang mengembalikan ID petugas/pesanan, lat/lng, waktu pembaruan ISO, akurasi dan status tugas. Sumber GPS berasal dari perangkat petugas. Data awal diambil melalui server-only API, lalu pembaruan live memakai kanal yang disepakati tim. Timestamp stale harus dihitung dari waktu server, bukan teks contoh. Interval refresh, autentikasi, izin lokasi mobile dan data rute dibahas saat integrasi.

Pengecualian dummy dicatat di PRD. Sebelum mengklaim fitur tracking memenuhi ketentuan dosen, ganti skenario dengan data API dan uji terhadap backend nyata. Data utama seluruh menu tetap menggunakan API.

## Bukti

- [Build produksi](tracking-build.txt).
- [Uji alur dan empat ukuran layar](tracking/qa.json).
- [9 uji tambahan: kegagalan peta, retry, reduced motion, footer, keyboard dan state simulasi](tracking/extra-qa.json).
- [Desktop](tracking/tracking-1280x820.png), [tablet](tracking/tracking-768x1024.png), [ponsel](tracking/tracking-360x800.png), [landscape](tracking/tracking-800x360.png).

Desain dasar mengacu prototype petugas yang sudah tersimpan di figma-prototype/. Tracking merupakan tambahan UX, bukan frame Figma yang diklaim pixel-perfect. Akses konteks layer terbaru masih dibatasi quota MCP. Bayangan menu/statistik dan pill keterangan statistik disederhanakan agar halaman terasa lebih tenang; warna/font/susunan asli dipertahankan.
