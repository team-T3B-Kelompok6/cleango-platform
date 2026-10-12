# UI → Backend Mapping

## Status reference

Audit repository dan seluruh attachment pada 6 Oktober 2026 tidak menemukan
screenshot, Figma, PDF, atau gambar UI CleanGo. Karena itu tidak ada gambar yang
dapat dianalisis satu per satu. Mapping ini hanya berasal dari requirement
tertulis. **Bagian visual lain tidak cukup jelas dari reference.**

## Customer

| Page | UI element tertulis | Database | API | Auth | Business rule |
|---|---|---|---|---|---|
| Login/Register | nama, email, telepon, password | `users` | auth register/login | public | password bcrypt; role customer |
| Home/Search | search, category/service card, harga, durasi | `categories`, `services` | customer categories/services | public | hanya data aktif |
| Service Detail | nama, deskripsi, harga, duration, inclusion | `services`, `service_inclusions` | service detail | public | harga dari database |
| Profile | nama, email, telepon | `users` | direncanakan profile | customer | identity dari JWT |
| Address | form dan daftar alamat | `addresses` | direncanakan CRUD addresses | customer | ownership dari JWT |
| Booking | service, alamat, tanggal, jam, notes | `bookings`, `services`, `addresses`, history | direncanakan create booking | customer | harga/status/customer dihitung backend dalam transaction |
| Order Status | status dan timeline | `bookings`, history | direncanakan booking detail | customer | hanya pemilik booking |
| Review | rating 1–5, komentar | `reviews` | direncanakan review | customer | hanya completed; satu review |
| Notification | list dan read | `notifications` | direncanakan list/mark read | customer | hanya milik user |
| Support | tipe dan deskripsi | `support_requests` | direncanakan create/list | customer | booking milik user |

## Admin

| Page | UI element tertulis | Database | API | Auth | Business rule |
|---|---|---|---|---|---|
| Login | email, password | `users` | admin login | public | role dari DB/JWT |
| Dashboard | KPI cards | bookings/users/cleaners | direncanakan dashboard | admin | aggregate server-side |
| Categories | table/form CRUD | `categories` | CRUD admin categories | admin | nama unik |
| Services | table/search/form CRUD | services/categories | CRUD admin services | admin | category valid |
| Orders | table, filter, status, assign | bookings/history/schedules | direncanakan orders | admin | transaksi status/assignment |
| Cleaners | table/form/status | cleaners/schedules | direncanakan CRUD | admin | jadwal tidak bentrok |
| Payments/Reviews/Support | table/detail/status | tabel terkait | direncanakan | admin | perubahan tervalidasi |
| Reports | filter/ringkasan | agregat | direncanakan reports | admin | query model |
