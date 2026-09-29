# CleanGo Backend API / RPC

Semua contoh memakai Supabase JS. JWT customer/admin dikirim oleh Supabase
client; jangan mengirim `user_id`, role, harga, total, status, atau cleaner dari
input customer.

## RPC tersedia (Fase 1–9)

### `create_booking`

Membuat booking secara transactional. Hanya user `authenticated`; identitas
diambil dari `auth.uid()`. Harga dan durasi diambil dari `services`, promo
divalidasi dan dihitung di database, booking code dibuat dengan counter yang
aman terhadap race, lalu history `pending` dibuat.

| Field | Type | Wajib | Keterangan |
|---|---|---:|---|
| `p_service_id` | uuid | ya | Layanan aktif |
| `p_address_id` | uuid | ya | Alamat milik user |
| `p_booking_date` | date | ya | Tanggal lokal Asia/Jakarta |
| `p_booking_time` | time | ya | Jam lokal Asia/Jakarta |
| `p_notes` | text | tidak | Catatan customer |
| `p_promo_code` | text | tidak | Kode promo, case-insensitive |

Output: satu row lengkap `bookings`, termasuk `booking_code`, `subtotal`,
`discount_amount`, `total_price`, waktu terjadwal, dan status `pending`.

Possible errors: `AUTH_REQUIRED`, `PROFILE_NOT_FOUND`, `SERVICE_NOT_FOUND`,
`SERVICE_INACTIVE`, `ADDRESS_NOT_FOUND`, `ADDRESS_NOT_OWNED`,
`INVALID_BOOKING_SCHEDULE`, `PROMO_NOT_FOUND`, `PROMO_EXPIRED`,
`PROMO_INVALID`, `PROMO_ALREADY_USED`, `PROMO_USAGE_LIMIT_REACHED`.

```ts
const { data, error } = await supabase.rpc('create_booking', {
  p_service_id: serviceId,
  p_address_id: addressId,
  p_booking_date: '2026-10-10',
  p_booking_time: '09:00:00',
  p_notes: 'Mohon bawa alat lengkap',
  p_promo_code: 'HEMAT10'
})
```

```json
{
  "booking_code": "CG-20260926-0001",
  "subtotal": 150000,
  "discount_amount": 15000,
  "total_price": 135000,
  "status": "pending"
}
```

### `assign_cleaner`

Menugaskan cleaner aktif ke booking berstatus `confirmed`. Hanya admin. Fungsi
mengunci booking dan cleaner, membuat schedule, mengubah status menjadi
`cleaner_assigned`, menulis history, dan membuat notification. Konflik waktu
tetap ditolak oleh exclusion constraint walaupun ada request paralel.

| Field | Type | Wajib |
|---|---|---:|
| `p_booking_id` | uuid | ya |
| `p_cleaner_id` | uuid | ya |

Output: row `bookings` setelah assignment.

Possible errors: `AUTH_REQUIRED`, `FORBIDDEN`, `BOOKING_NOT_FOUND`,
`INVALID_BOOKING_STATUS`, `CLEANER_NOT_FOUND`, `CLEANER_NOT_ACTIVE`,
`CLEANER_SCHEDULE_CONFLICT`.

```ts
const { data, error } = await supabase.rpc('assign_cleaner', {
  p_booking_id: bookingId,
  p_cleaner_id: cleanerId
})
```

## Query langsung yang tersedia

Customer authenticated dapat membaca catalog aktif, profile/alamat/booking,
history, payment, notification, promo usage, ETA, support request, dan lokasi
aktif miliknya sesuai RLS. Admin mendapat akses baca lintas user dan CRUD
catalog sesuai policy. Insert/update langsung ke booking, schedule, history,
promo usage, dan notification tidak diberikan kepada client.

```ts
const { data } = await supabase
  .from('bookings')
  .select('*, services(*), booking_status_history(*)')
  .order('created_at', { ascending: false })
```

RLS otomatis membatasi hasil customer ke booking miliknya.

## RPC roadmap (belum diimplementasikan)

| RPC | Fase | Tujuan |
|---|---:|---|
| `update_booking_status` | 10 | Transition, history, notification, cleaner state |
| Realtime publications | 11 | Booking/history/notification/location events |
| `validate_promo`, payment operation | 12 | Promo reusable dan pembayaran mock/manual |
| `create_review` | 13 | Review completed booking dan rating cleaner |
| `create_support_request` | 14 | Bantuan untuk booking sendiri |
| `update_cleaner_location`, `get_latest_cleaner_location` | 15 | Lokasi active booking |
| `calculate_eta` | 16 | ETA rule-based/provider abstraction |
| `evaluate_booking_risk` | 17 | Delay/no-show rule-based |
| `get_admin_dashboard_summary` | 18 | Dashboard/reporting |
| AI endpoint server-side | 19 | Chatbot dengan scoped customer context |
| `get_my_bookings`, `get_my_active_booking`, `get_booking_detail`, `mark_notification_as_read` | 20 | API convenience dan final hardening |
