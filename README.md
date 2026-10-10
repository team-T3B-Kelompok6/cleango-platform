# Cleango Admin

Frontend aktif menggunakan **Next.js App Router, React Server Components, dan TypeScript/TSX** sesuai ketentuan UTS. Lingkup pengerjaan pengguna adalah frontend; Express dan database menjadi bagian anggota backend.

## Struktur proyek

```text
code/
├── CLEANGO-PRD.md                 # acuan produk, di luar folder kode
├── cleango-vite-reference/        # arsip slicing lama, terpisah dari repo aktif
└── web admin cleango/             # repositori kelompok
    ├── AGENTS.md                  # panduan Codex dan konfigurasi skill
    ├── backend/                  # bagian anggota backend
    ├── frontend/                 # implementasi Next.js aktif
    │   ├── app/
    │   ├── components/
    │   ├── lib/
    │   ├── types/
    │   ├── public/
    │   └── docs/                 # kontrak API, hasil uji, audit desain
    └── docs/agents/              # konfigurasi engineering skills
```

Folder node_modules, dist dan .next adalah hasil instalasi/build lokal yang diabaikan Git, bukan sumber frontend aktif. Arsip Vite berada di luar repositori dan tidak dihapus.

## Menjalankan frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
# Isi API_URL dengan URL API tim, termasuk /api.
npm run dev
```

Buka http://127.0.0.1:3000. Akun admin/admin perlu disediakan oleh backend. Tanpa API, login menampilkan pesan koneksi gagal.

Dari root, gunakan npm run setup:frontend untuk memasang dependensi. npm run dev, build, typecheck, format dan format:check diteruskan ke frontend Next.js.

Panduan lengkap: [frontend/README.md](frontend/README.md). Kontrak integrasi: [API-CONTRACT.md](frontend/docs/API-CONTRACT.md). Urutan audit halaman dan batas verifikasi: [DESIGN-AUDIT.md](frontend/docs/DESIGN-AUDIT.md). PRD aktif: [../CLEANGO-PRD.md](../CLEANGO-PRD.md).

## Status

Build, pemeriksaan TypeScript, responsif dan 18 uji alur frontend telah dicatat. Pengujian alur menggunakan fixture HTTP sementara di luar aplikasi; ini belum membuktikan integrasi Express/database. Revisi sembilan halaman terhadap prototype Figma selesai, memakai skill figma-design-to-code dan PRD. Bukti 36 pemeriksaan responsif serta 9 uji interaksi tambahan tersedia di frontend/docs/revised/. Verifikasi layer/aset terbaru masih terbatas oleh akses Figma MCP. Backend yang sudah ada tidak diubah pada penataan ini.

Tim melengkapi API Express, database.sql, seed, dokumentasi backend, bukti perbandingan Figma, GitHub/Trello dan presentasi sebelum pengumpulan.

Tracking petugas tersedia sebagai **simulasi dummy** sesuai permintaan pengguna, melalui tombol Pantau Petugas di menu Petugas serta pesanan yang sudah ditugaskan. Panduan dan batas integrasinya: [TRACKING.md](frontend/docs/TRACKING.md). Simulasi ini terpisah dari data utama API dan belum menjadi pelacakan GPS aktual.
