# Database CleanGo (MariaDB/MySQL)

Sumber schema yang dapat dijalankan ulang adalah `database.sql` di root backend.

Schema memiliki 13 tabel inti: `users`, `addresses`, `categories`, `services`,
`service_inclusions`, `cleaners`, `bookings`, `booking_status_history`,
`cleaner_schedules`, `payments`, `reviews`, `notifications`, dan
`support_requests`.

`database.sql` membuat database `cleango`, table, primary/foreign/unique key,
check, index, serta seed kategori dan layanan secara idempotent. Password user
tidak diseed karena harus selalu dibuat melalui bcrypt. Untuk admin lokal,
register user lalu ubah role-nya melalui SQL seperti dijelaskan README.

Credential runtime berasal dari `.env`; akses Node memakai satu connection pool
`mysql2/promise`. Model menggunakan raw SQL ber-placeholder dan tidak membuka
connection baru untuk setiap request. Dedicated connection akan digunakan hanya
untuk transaction multi-query.
