# Express + Next.js Starter

Fondasi satu repositori untuk backend Express.js dan frontend Next.js App Router. Proyek ini masih berupa setup awal: belum ada slicing UI, resource bisnis, integrasi mobile, tabel, atau seed database.

## Prasyarat

- Node.js 20.9 atau lebih baru (disarankan versi LTS)
- npm
- MariaDB atau MySQL hanya diperlukan saat fitur database mulai dibuat

## Instalasi

```bash
npm install
```

Salin konfigurasi contoh bila ingin menjalankan masing-masing aplikasi:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

Jalankan backend dan frontend pada dua terminal terpisah:

```bash
npm run dev:backend
npm run dev:frontend
```

- Backend: http://localhost:3001
- Health check: http://localhost:3001/api/health
- Frontend: http://localhost:3000

Backend tidak membuka koneksi database saat startup. Karena itu, setup dapat dijalankan sebelum MariaDB atau MySQL dipilih dan disiapkan.

## Struktur

```text
backend/
  server.js
  database.sql
  src/
    controller/
    lib/
    model/
    routes/
frontend/
  app/
  components/
  lib/
  public/
  types/
```

## Batas setup saat ini

- `database.sql` sengaja belum memiliki tabel maupun data awal.
- Pool `mysql2` kompatibel dengan MariaDB dan MySQL.
- API baru menyediakan health check; endpoint resource dibuat setelah model data disepakati.
- Frontend baru berisi halaman starter berbasis React Server Component.
- Belum ada koneksi ke aplikasi mobile.

