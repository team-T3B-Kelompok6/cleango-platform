# DESIGN.md — Sistem desain web CleanGo

Dokumen ini adalah kontrak nilai visual untuk aplikasi web admin CleanGo **sebagaimana
yang berjalan sekarang**. Semua angka di bawah dibaca dari kode di `frontend/`, bukan dari
file desain. Dipakai sebagai rujukan tunggal saat styling dipindahkan ke Tailwind CSS 4:
setiap warna, ukuran teks, radius, dan bayangan di `app/globals.css` (`@theme`) harus
berasal dari sini.

## 0. Asal data

|                   |                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Sumber            | `frontend/app/*.css`, `frontend/components/**`, `frontend/app/layout.tsx`                                               |
| Lapisan token     | `app/tokens.css` — 280 token warna, 62 token spasi, 25 token teks, 25 token `--ui-*`                                    |
| File gaya         | 1 file token + 13 file CSS (6.953 deklarasi)                                                                            |
| Komponen          | 80 file TSX, 45 komponen, 694 pemakaian `className`                                                                     |
| Font              | `next/font/google` di `app/layout.tsx`: `DM_Sans` → `--font-body`, `Plus_Jakarta_Sans` → `--font-heading`               |
| Tanggal pembacaan | 16 November 2026                                                                                                        |
| Metode            | analisis statis: deklarasi CSS dikelompokkan per properti, pemakaian token dihitung per peran (bg/teks/border/bayangan) |

Urutan import di `app/layout.tsx` menentukan cascade, jadi nilai "efektif" sebuah kelas
adalah deklarasi terakhir menurut urutan itu:
`tokens → globals → admin → overrides → design → tracking → management → service-editor →
promo-editor → staff-profile → record-dialogs → cleaner → refinement → audit`.

Catatan penting: dokumen ini **as-built**, bukan aspirasi. Bagian §2.2 dan §10 mencatat
tempat kode menyimpang dari dirinya sendiri; penyimpangan itu tidak dijadikan aturan.

## 1. Prinsip visual

1. **Hijau sebagai aksi, bukan dekorasi.** Aksen dipakai untuk tombol utama, item navigasi
   aktif, dan grafik. Permukaan tetap putih atau `#f5f8f6`.
2. **Badge hanya untuk status.** `StatusBadge` (`components/StatusBadge.tsx`) adalah
   satu-satunya pemakai keluarga warna status; label dan angka lain tidak memakai badge.
3. **Dua tingkat teks.** Judul memakai Plus Jakarta Sans (`var(--heading)`), isi memakai
   DM Sans. Tidak ada font ketiga; satu-satunya pengecualian `'DM Sans Variable'` adalah
   sisa yang harus dihapus.
4. **Kepadatan tinggi.** Ukuran teks isi 12–15px dengan langkah spasi 4–12px; satu layar
   harus memuat 4–8 baris pesanan.
5. **Garis tipis lebih disukai daripada bayangan.** `border: 1px solid var(--ui-border)`
   adalah pemisah utama; 19 aturan `box-shadow` justru `none`.

## 2. Warna

### 2.1 Palet kanonik

Token kanonik diambil dari `--ui-*` dan `--color-###` yang benar-benar dipakai. Kolom bukti
adalah jumlah pemakaian di 13 file CSS, dipisah per peran.

| Token           | Sumber              | Nilai       | Bukti (bg/teks/border) | Peran                            |
| --------------- | ------------------- | ----------- | ---------------------- | -------------------------------- |
| `surface`       | `--color-007`       | `#ffffff`   | 42/16/1                | kartu, panel, header             |
| `canvas`        | `--color-002`       | `#f5f8f6`   | 10/0/0                 | latar halaman                    |
| `surface-soft`  | `--color-016`       | `#fbfdfc`   | 4/0/0                  | panel dalam, popover             |
| `surface-tint`  | `--color-010`       | `#effaf5`   | 9/0/0                  | sorotan hijau lembut             |
| `line`          | `--ui-border`       | `#dde6e1`   | 0/0/border utama       | border default                   |
| `line-soft`     | `--color-004`       | `#e4ece7`   | 0/0/3                  | pemisah antar-baris              |
| `line-strong`   | `--color-053`       | `#bbead0`   | 0/0/10                 | border kartu aktif / field fokus |
| `ink`           | `--color-001`       | `#16231d`   | 0/6/0                  | teks utama                       |
| `ink-soft`      | `--color-017`       | `#34483e`   | 1/8/0                  | sub-judul, angka metrik          |
| `ink-muted`     | `--ui-muted`        | `#596d63`   | teks sekunder          | label, deskripsi                 |
| `ink-meta`      | `--color-020`       | `#65756d`   | 0/4/0                  | waktu, keterangan                |
| `ink-faint`     | `--color-008`       | `#809087`   | 0/5/0                  | placeholder, meta kecil          |
| `accent`        | `--ui-accent`       | `#0a805b`   | fill aksi              | tombol utama, nav aktif          |
| `accent-hover`  | `--ui-accent-hover` | `#066647`   | hover dan teks aksen   | hover, tautan                    |
| `accent-soft`   | `--ui-accent-soft`  | `#ecf7f1`   | latar aksen            | latar tombol sekunder            |
| `accent-bright` | `--color-003`       | `#20c875`   | 5/2/1                  | indikator progres, logo          |
| `accent-ring`   | `--ui-focus`        | `#81baa4`   | outline 2px            | fokus keyboard                   |
| `success`       | `--color-023`       | `#11985a`   | 1/11/0                 | teks status selesai              |
| `warning`       | `--ui-amber`        | `#91610c`   | 1/6/1                  | teks status menunggu             |
| `danger`        | `--color-090`       | `#b94b42`   | 0/9/1                  | batal, error form                |
| `info`          | `--ui-blue`         | `#156885`   | 0/2/0                  | status berjalan                  |
| `overlay`       | `--ui-backdrop`     | `#192c244d` | backdrop dialog        | latar belakang modal             |

22 token di atas menutup seluruh peran yang dipakai kode. `--color-###` lain hanya boleh
menjadi sumber pemetaan, tidak boleh muncul sebagai token baru.

### 2.2 Duplikat dan penyimpangan yang tercatat

Bagian ini menggantikan "palet sekunder" pada dokumen desain: yang ada di kode bukan palet
kedua, melainkan pengulangan nilai dan nilai di luar token.

| Temuan                     | Angka                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Token bernilai sama persis | **43 token dalam 19 grup**                                                                           |
| Contoh                     | `--text-10`, `--text-11`, `--text-12` semuanya `1.166667rem` (14px); `--space-14` juga `1.166667rem` |
| Warna dideklarasikan       | 280 (`--color-001`…`--color-280`)                                                                    |
| Warna dipakai              | 277; **216 dipakai tepat sekali**                                                                    |
| Hex literal di luar token  | **92 nilai, 166 pemakaian** (`#087f60` 14×, `#687b73` 11×, `#e6ece9` 7×)                             |
| Deklarasi warna            | 753 lewat token vs 159 literal                                                                       |
| Deklarasi spasi            | 739 lewat token vs 464 literal                                                                       |
| Deklarasi `font-size`      | 510 lewat token vs 163 literal                                                                       |
| Kelas CSS tanpa pemakaian  | **192 dari 654 (29%)** — mis. `admin-badge`, `service-grid`, `customer-row`                          |

Keputusan **D-1**: nilai duplikat disatukan dengan mengambil nilai mayoritas; `--color-###`
yang identik dengan token kanonik dipetakan, sisanya dibuang saat file CSS dihapus.

### 2.3 Skala warna status

Sumber: `--tone` / `--tone-bg` di `globals.css:513–522` dan `design.css:241–248`, dipilih
oleh `tone()` di `lib/resources.ts` dan dirender oleh `components/StatusBadge.tsx`
(titik 5px + teks 12px, radius pill).

| Status                     | Latar     | Teks      | Token                         |
| -------------------------- | --------- | --------- | ----------------------------- |
| Selesai / Aktif / Tersedia | `#e8fbf1` | `#138b50` | `accent-soft` / `--color-035` |
| Berjalan / Menuju Lokasi   | `#e7f7fb` | `#0781ae` | `--color-037` / `--color-036` |
| Menunggu / Perlu Tindakan  | `#fff5e5` | `#af720f` | `--color-039` / `--color-038` |
| Batal / Gagal              | `#fff1ed` | `#b94b42` | `--color-055` / `danger`      |
| Netral / Nonaktif          | `#edf1ee` | `#596d63` | `--color-070` / `ink-muted`   |

Catatan penyimpangan (jangan ditiru, diperbaiki saat migrasi): `.status-badge.green` di
`management.css` menimpa teks menjadi `--ui-accent-hover` `#066647`, sehingga titik badge
tetap `#138b50` sementara teksnya `#066647`.

### 2.4 Pemetaan dari token lama

Saat `app/tokens.css` dihapus, 30 token `--color-###` dengan pemakaian terbanyak dipetakan
sebagai berikut. Kolom "dipakai" adalah jumlah pemakaian di 13 file CSS.

| Token lama                 | Nilai                 | Dipakai      | Token baru                    |
| -------------------------- | --------------------- | ------------ | ----------------------------- |
| `--color-007`              | `#fff`                | 60           | `surface`                     |
| `--color-023`              | `#11985a`             | 13           | `success`                     |
| `--color-003`              | `#20c875`             | 11           | `accent-bright`               |
| `--color-002`              | `#f5f8f6`             | 11           | `canvas`                      |
| `--color-056`              | `#b34836`             | 10           | `danger` (varian lebih gelap) |
| `--color-053`              | `#bbead0`             | 10           | `line-strong`                 |
| `--color-017`              | `#34483e`             | 9            | `ink-soft`                    |
| `--color-001`              | `#16231d`             | 9            | `ink`                         |
| `--color-010`              | `#effaf5`             | 9            | `surface-tint`                |
| `--color-038`              | `#af720f`             | 9            | `warning`                     |
| `--color-055`              | `#fff1ed`             | 8            | `danger-soft`                 |
| `--color-022`              | `#e8fbf1`             | 7            | `success-soft`                |
| `--color-095`              | `#173b2b`             | 6            | `accent-deep`                 |
| `--color-039`              | `#fff5e5`             | 6            | `warning-soft`                |
| `--color-008`              | `#809087`             | 6            | `ink-faint`                   |
| `--color-016`              | `#fbfdfc`             | 5            | `surface-soft`                |
| `--color-013`              | `#357457`             | 5            | `success-strong`              |
| `--color-020`              | `#65756d`             | 5            | `ink-meta`                    |
| `--color-126`              | `#53665a`             | 4            | `ink-muted`                   |
| `--color-031`              | `#2e513e0a`           | 4 (bayangan) | `shadow-card`                 |
| `--color-028`              | `#bee7d1`             | 4 (border)   | `line-strong`                 |
| `--color-035`              | `#138b50`             | 4            | status selesai                |
| `--color-036`              | `#0781ae`             | 4            | status berjalan               |
| `--ui-accent`              | `#0a805b`             | fill         | `accent`                      |
| `--ui-accent-hover`        | `#066647`             | hover        | `accent-hover`                |
| `--ui-accent-soft`         | `#ecf7f1`             | latar        | `accent-soft`                 |
| `--ui-muted`               | `#596d63`             | teks         | `ink-muted`                   |
| `--ui-border`              | `#dde6e1`             | border       | `line`                        |
| `--ui-focus`               | `#81baa4`             | ring         | `accent-ring`                 |
| `--ui-blue` / `--ui-amber` | `#156885` / `#91610c` | status       | `info` / `warning`            |

Sisa 250 token dipetakan ke token terdekat saat konversi per halaman.

## 3. Tipografi

### 3.1 Keluarga font

| Peran                | Font                                    | Variabel                                  | Bobot yang dipakai |
| -------------------- | --------------------------------------- | ----------------------------------------- | ------------------ |
| Judul, label, tombol | **Plus Jakarta Sans**                   | `--font-heading`, dipakai via `--heading` | 600, 700, 800      |
| Isi, tabel, meta     | **DM Sans**                             | `--font-body`                             | 400, 500, 600, 700 |
| Ikon                 | komponen `Icon` / `UiIcon` (SVG inline) | —                                         | —                  |

Bukti: `font-weight` 600 (53×), 700 (41×), 500 (17×), 400 (9×), 800 (8×), 650 (2× — nilai
tidak standar, dibulatkan ke 600). `font-family` hanya muncul 15× karena diwarisi dari
`:root`; ada 1 pemakaian `'DM Sans Variable'` dan 2 `inherit` yang harus dibersihkan. Tidak
ada font family baru di CSS.

### 3.2 Skala

Dua sumber: token `--text-N` di `tokens.css` (nilai dalam px pada root 12px) dan pemakaian
nyata di CSS. Ukuran yang benar-benar dipakai berkisar 11–18px untuk isi.

| Token       | px  | Frek pemakaian | Pemakaian utama      | Line height kode |
| ----------- | --- | -------------- | -------------------- | ---------------- |
| `--text-8`  | 12  | 14             | caption, meta        | 1.5              |
| `--text-9`  | 12  | 65             | badge, tabel, footer | 1.5              |
| `--text-10` | 14  | **96**         | isi default          | 1.5–1.6          |
| `--text-11` | 14  | 64             | label kontrol        | 1.5              |
| `--text-12` | 14  | 51             | teks kartu           | 1.5              |
| `--text-13` | 15  | 24             | isi panel            | 1.6              |
| `--text-14` | 16  | 22             | judul baris          | 1.5              |
| `--text-16` | 18  | 16             | judul seksi          | 1.5              |
| `--text-18` | 20  | —              | sub-judul            | 1.5              |
| `--text-20` | 22  | —              | judul halaman kecil  | 1.3              |
| `--text-22` | 24  | —              | judul halaman        | 1.3              |
| `--text-24` | 26  | —              | judul halaman besar  | 1.3              |
| `--text-32` | 32  | —              | angka nilai          | 1.1              |
| `--text-40` | 40  | —              | angka besar          | 1.1              |
| `--text-56` | 56  | —              | angka hero           | 1                |

`--ui-text-*` adalah alias peran untuk ukuran yang sama:

| Token peran         | px  | Padanan           |
| ------------------- | --- | ----------------- |
| `--ui-text-small`   | 12  | `--text-8/9`      |
| `--ui-text-meta`    | 13  | — (dipakai 35×)   |
| `--ui-text-control` | 14  | `--text-10/11/12` |
| `--ui-text-body`    | 15  | `--text-13`       |
| `--ui-text-record`  | 16  | `--text-14`       |
| `--ui-text-section` | 18  | `--text-16`       |
| `--ui-text-page`    | 28  | —                 |
| `--ui-text-value`   | 32  | `--text-32`       |

Line height yang dipakai: 1.5 (51×), 1.6 (49×), 1.7 (26×), 1.55 (15×), 1.65 (12×), 1.45
(9×), 1.4 (8×). Skala seragam yang dipakai setelah migrasi: **1.2 / 1.3 / 1.5 / 1.6 / 1.7**.

### 3.3 Pemetaan dari token lama

| Token lama          | Nilai    | px  | Token baru  |
| ------------------- | -------- | --- | ----------- |
| `--ui-text-page`    | 2.333rem | 28  | `text-4xl`  |
| `--ui-text-value`   | 2.667rem | 32  | `text-5xl`  |
| `--ui-text-section` | 1.5rem   | 18  | `text-xl`   |
| `--ui-text-record`  | 1.333rem | 16  | `text-lg`   |
| `--ui-text-body`    | 1.25rem  | 15  | `text-md`   |
| `--ui-text-control` | 1.167rem | 14  | `text-base` |
| `--ui-text-meta`    | 1.083rem | 13  | `text-sm`   |
| `--ui-text-small`   | 1rem     | 12  | `text-xs`   |

## 4. Spasi dan layout

- Root font-size **75%** (12px). Satu langkah `--spacing` di Tailwind 4 = **1px** agar
  `p-12` berarti 12px, sama dengan `var(--space-12)`.
- 62 token `--space-N`, nilai N adalah px. Terbanyak dipakai: 12 (127×), 10 (88), 8 (86),
  16 (81), 18 (53), 5 (52), 6 (52), 7 (51), 20 (48), 14 (46), 13 (40), 4 (37).
- Pola spasi yang berulang: padding kartu 20px (`--ui-card-padding` 1.667rem), gap grid
  12–18px, padding halaman 28/34px.
- Tinggi kontrol: `--ui-control-height` 40px, `--ui-control-primary` 44px.
- **Layout dari kode** (`globals.css`):

| Elemen          | Nilai                                                       |
| --------------- | ----------------------------------------------------------- |
| Sidebar         | `width: 248px`, fixed, tinggi `max(720px, 100dvh)`          |
| `workspace`     | `margin-left: var(--space-248)` = 248px                     |
| Header          | `height: 72px`, sticky, `z-index: 50`                       |
| `main`          | `max-width: 1480px`, `padding: 28px 34px`, `margin: 0 auto` |
| Footer          | `margin: 20px 34px 0`, `padding: 13px 0`, teks 12px         |
| Sidebar z-index | 70 (header 50, popover 90)                                  |

- Breakpoint yang dipakai: **1440, 1150, 980, 700** (desktop-first, `max-width`), ditambah
  `max-height: 700px` untuk panel SOP. Di `@theme` nilainya ditulis **+1px**
  (1441/1151/981/701) karena varian `max-*` Tailwind memakai batas eksklusif.

## 5. Radius

| Token                              | Nilai     | Bukti                    | Dipakai untuk                                |
| ---------------------------------- | --------- | ------------------------ | -------------------------------------------- |
| `--ui-radius` / `--ui-radius-card` | **12px**  | 26 literal + 9 var       | kartu, panel, dialog kecil                   |
| `--ui-radius-dialog`               | **16px**  | token                    | modal                                        |
| `rounded-pill`                     | **999px** | token (`999px`/`9999px`) | badge status, chip                           |
| `rounded-control`                  | **8px**   | 27                       | tombol kecil, ikon, input                    |
| `rounded-md`                       | **10px**  | **39**                   | input, ikon bulat, chip                      |
| `rounded-sm`                       | **6px**   | 7                        | tag kecil                                    |
| `rounded-lg`                       | 14px      | 9                        | kartu tertentu (tidak konsisten dengan 12px) |
| 50% / 100%                         | —         | 28 / 91                  | avatar, titik, lingkaran ikon                |

Skala yang dipakai setelah migrasi: **6 / 8 / 10 / 12 / 16 / 999**. Nilai 5, 7, 9, 11, 13,
14, 18, 20 tidak dipertahankan.

## 6. Elevasi

| Token                 | Nilai                         | Sumber     | Dipakai untuk               |
| --------------------- | ----------------------------- | ---------- | --------------------------- |
| `--ui-shadow`         | `0 0.333rem 2rem #1738290a`   | token      | kartu terangkat             |
| `--ui-shadow-dialog`  | `0 20px 64px #162c2329`       | token      | modal                       |
| `--ui-shadow-popover` | `0 12px 36px #162c231a`       | token      | popover, dropdown           |
| `shadow-card`         | `0 2px 4px var(--color-182)`  | literal 2× | baris/kartu                 |
| `shadow-panel`        | `0 5px 18px var(--color-096)` | literal    | panel melayang              |
| —                     | `none`                        | 19 aturan  | kartu dan baris operasional |

`refinement.css` dan `design.css` sengaja mematikan bayangan pada kartu operasional
(`box-shadow: none; transform: none`) — efek angkat hanya untuk modal dan popover.

## 7. Motion

| Token            | Nilai                      | Pemakaian                 |
| ---------------- | -------------------------- | ------------------------- |
| `--motion-fast`  | 140ms                      | warna, hover, outline     |
| `--motion-base`  | 180ms                      | popover, tab, fade konten |
| `--motion-panel` | 220ms                      | panel dan dialog          |
| `--motion-ease`  | `cubic-bezier(.2,.7,.3,1)` | semua transisi            |

Keyframes yang ada:

| Nama               | Durasi          | Berkas        | Dipakai                      |
| ------------------ | --------------- | ------------- | ---------------------------- |
| `soft-rise`        | `--motion-base` | `globals.css` | panel muncul                 |
| `tab-select`       | 280ms           | `globals.css` | indikator tab                |
| `content-fade`     | `--motion-base` | `globals.css` | `page-content` saat navigasi |
| `skeleton-pulse`   | 1.4s            | `globals.css` | `Skeleton`                   |
| `admin-content-in` | 260ms / 200ms   | `admin.css`   | konten dashboard             |

Penyimpangan: durasi 260ms dan 280ms tidak punya token. Setelah migrasi semua durasi
memakai tiga token di atas, dan `prefers-reduced-motion: reduce` mematikan animasi
(bukan hanya mempercepat).

## 8. Inventaris komponen

45 komponen di `components/`. Kolom "kelas" adalah kelas CSS yang menjadi kontrak visualnya
sekarang; setelah migrasi kolom itu menjadi komponen Tailwind.

| Komponen                  | Berkas                                 | Kelas utama                                                                | Catatan                           |
| ------------------------- | -------------------------------------- | -------------------------------------------------------------------------- | --------------------------------- |
| `AppShell`                | `app/(admin)/layout.tsx`               | `app-shell`, `workspace`, `header`, `page-content`                         | sidebar 248px, header 72px        |
| `Sidebar`                 | `AdminSidebar.tsx`                     | `sidebar`, `sidebar-brand`, `nav-link` (+ `is-active`)                     | collapse via `sidebar--collapsed` |
| `MobileNavigation`        | `Navigation.tsx`                       | `nav-link-label`                                                           | tampil < 700px                    |
| `SearchInput`             | `Filters.tsx`                          | `global-search`, `next-filter`                                             | lebar 390px di header             |
| `Notifications`           | `Notifications.tsx`                    | `notification-anchor`, `notification-popover`, `notification-item`         | popover native                    |
| `MetricCard`              | `MetricCard.tsx`                       | `metric-card`, `metric-top`, `metric-value`, `metric-label`, `metric-note` | ikon bulat kanan atas             |
| `StatusBadge`             | `StatusBadge.tsx`                      | `status-badge` + `green/blue/amber/red/neutral`                            | titik 5px, pill                   |
| `Tabs`                    | `ResourcePages.tsx`, `OrderList.tsx`   | `manage-tabs`, `order-tabs`, `dialog-tabs`                                 | tombol `selected`                 |
| `Modal`                   | `Modal.tsx`                            | `modal`, `modal-header`, `modal-footer`                                    | 9 file mendefinisikan ulang       |
| `Dialog` (record)         | `RecordDetailModal.tsx`                | `record-detail-dialog`, `detail-dialog-footer`                             | lebar 720px                       |
| `SopDialog`               | `SopDialog.tsx`                        | `sop-dialog`, `sop-content`, `sop-steps`                                   | panel 1040px                      |
| `Form`                    | `Form.tsx`                             | `next-form`, `form-grid`, `form-error`, `form-success`                     | label + hint + error              |
| `ServiceForm`             | `ServiceForm.tsx`                      | `service-field`, `service-photo`                                           | editor layanan                    |
| `PromoForm`               | `PromoForm.tsx`                        | `field-error`, `promo-*`                                                   | editor promo                      |
| `StaffDetail`             | `StaffDetailServer.tsx`                | `staff-profile-summary`, `staff-profile-contact`                           | profil petugas                    |
| `StaffPhotoField`         | `StaffPhotoField.tsx`                  | `staff-photo-field`                                                        | upload foto                       |
| `OrderList`               | `OrderList.tsx`                        | `order-card`, `order-card-top`, `order-info`                               | baris pesanan                     |
| `PeopleList`              | `PeopleList.tsx`                       | `figma-person-row`, `figma-person-main`                                    | baris petugas/customer            |
| `ServiceList`             | `ServiceList.tsx`                      | `figma-service-row`, `figma-service-top`                                   | baris layanan                     |
| `ScheduleList`            | `ScheduleList.tsx`                     | `shift-card`, `shift-section`                                              | board jadwal                      |
| `ReportView`              | `ReportView.tsx`                       | `report-page`, `finance-order-row`, `finance-bar`                          | laporan                           |
| `AuditLogView`            | `AuditLogView.tsx`                     | `modal-body audit-detail`, `audit-action`                                  | 43 `className`                    |
| `CleanerPortal`           | `cleaner/CleanerPortal.tsx`            | `cleaner-portal`, `cleaner-gps-card`                                       | portal petugas                    |
| `TrackingPanel`           | `tracking/TrackingPanel.tsx`           | `tracking-*`                                                               | Leaflet                           |
| `DateCalendar`            | `DateCalendar.tsx`                     | `date-calendar`, `date-popover`                                            | filter tanggal                    |
| `EmptyState` / `Skeleton` | `ResourcePages.tsx`, `app/loading.tsx` | `empty-state`, `skeleton-card`, `skeleton-line`                            | state kosong & loading            |
| `Icon` / `UiIcon`         | `Icon.tsx`, `UiIcon.tsx`               | `icon`, `ui-icon` (50 rule)                                                | SVG inline                        |

> **Pembaruan 16 November 2026 (setelah R1–R2).** Tabel di atas adalah kondisi _sebelum_
> migrasi. Komponen reusable sudah dikonversi ke utility Tailwind dan dipindah:
>
> - `components/shared/ui/`: `Icon`, `UiIcon`, `CleanGoLogo`, `Modal`, `DialogTrigger`,
>   `DialogContext`, `DialogNote`, `DialogHeader/Body/Footer/CloseButton`, `Avatar`,
>   `BrandLogo`, `Button` (+ `buttonVariants`), `ButtonLink`, `Card`, `Input`, `Label`,
>   `Select`, `IconButton`, `EmptyState`, `MetricCard`, `MetricGrid`, `PageHeader`,
>   `SectionHeading`, `StatusBadge`, `TextLink`, `statusTone`.
> - `components/shared/layout/`: `AdminShell`, `AuthLayout`, `Sidebar`, `SidebarNav`,
>   `Topbar`, `TopbarDate`, `SearchField`, `UserMenu`, `NotificationsMenu`,
>   `NotificationItem`, `MobileNav`, `Footer`, `LiveSync`, `data.ts`.
> - Dashboard: `app/(admin)/page.tsx` → `components/dashboard/` (`DashboardView`,
>   `AnnouncementCard`, `ActivityList`, `ActivityRow`, `data.ts`) + `lib/dashboard-summary.ts`.
> - Pesanan: `components/orders/` (daftar + `OrderActions`), `components/orders/detail/`
>   (`BookingPreview`), `components/booking/editors/` (`OrderEditor`, `ScheduleEditor`,
>   `Field`, `FormFeedback`, `CancelButton`) + primitif `shared/ui/Initials`.
> - Pantau Petugas: `components/tracking/` (`TrackingButton`, `TrackingPanel`, `MonitorBoard`,
>   `StaffMonitorCard`, `PreviewPane`, `StaffLocationDialog`, `data.ts`) +
>   `hooks/useTrackingPanel.ts` + `lib/tracking.ts`. Kelas `tracking-*`, `dispatch-*`,
>   `staff-monitor-*`, `staff-task-*`, `staff-location-*`, dan `cleaner-preview-*` dihapus;
>   `app/tracking.css` tidak ada lagi.
> - Hapus record: `shared/ui/ConfirmDialog` (tombol ikon + dialog + server action) dipakai
>   `DeleteRecordButton`; `DeleteForm` di `Form.tsx` dihapus. Kelas `icon-action` dan
>   `record-delete` hilang; `Button` mendapat varian `danger`, `Modal` mendapat `iconTone`.
> - Petugas: `components/people/` (`PeopleList`, `StaffRow`, `CustomerRow`) dan
>   `components/staff/` (`StaffAvatar`, `StaffPhotoField`, `StaffPhone`, `StaffDetail`,
>   `StaffDetailModal`, `StaffDetailFooter`, `StaffDetailServer`, `StaffForm`, `StaffSkills`,
>   `StaffMentor`, `data.ts`). Kelas `staff-*`, `staff-photo*`, `staff-profile-*`,
>   `figma-person-*`, `managed-person-row`, `managed-record-footer`, `person-missing`, dan
>   `service-skills` dihapus; `app/staff-profile.css` tidak ada lagi. `buttonVariants` dipindah
>   ke `shared/ui/buttonVariants.ts` agar bisa dipanggil server component.
> - Portal petugas: `components/cleaner/portal/` (8 komponen + `data.ts`) +
>   `hooks/useCleanerTask.ts` + `lib/cleaner/format.ts`. Kelas `cleaner-*`, `delivery-*`,
>   `dispatch-result-note` dihapus; `app/cleaner.css` tidak ada lagi.
> - Kerangka daftar & form: `.resource-page`, `.resource-filter-bar`, `.faq-filter-bar`,
>   `.admin-add`, `.edit-action`, `.next-form`, `.form-grid`, `.manage-form`, `.field-*`,
>   `.form-error` diganti utility; `Form.tsx` memakai `DialogBody`/`DialogFooter`.
> - Kelola jadwal: `components/schedules/` (`ScheduleBoard`, `ShiftSection`, `ShiftCard`,
>   `EmptyShiftCard`, `data.ts`) + `lib/schedules.ts` + `hooks/useScheduleEditor.ts`. Kelas
>   `shift-*`, `empty-slot`, `schedule-row`, dan `schedules-detail-dialog` dihapus; lebar dialog
>   jadwal memakai prop `dialogWidth` pada `DialogTrigger`.
> - Kelola layanan: `components/services/`, `components/categories/`, dan `components/promos/`
>   dengan hook masing-masing (`useServiceForm`, `useCategoryForm`, `usePromoForm`,
>   `usePromoList`) dan lib murni (`lib/service-form.ts`, `lib/category-form.ts`,
>   `lib/promo-editor.ts`). Kelas `service-*`, `promo-*`, `category-*`, `figma-service-*`,
>   `service-field` dihapus; `app/service-editor.css` dan `app/promo-editor.css` tidak ada lagi.
>   Lebar dialog layanan memakai `dialogWidth={1000}`.
> - Kelola FAQ: `components/faq/` (`FaqList`, `FaqRow`, `FaqPagination`, `FaqDetail`,
>   `FaqForm`, `data.ts`) + `lib/faq.ts` + `lib/faq-form.ts` + `hooks/useFaqForm.ts`. Kelas
>   `faq-*`, `faqs-detail-dialog`, `managed-faq-row`, dan `detail-category` dihapus; pagination
>   4/halaman dan tab kategori dipindah ke `lib/faq.ts`; detail FAQ memakai `width={540}`.
> - Kelola customer: `components/customers/` (`CustomerDetail`, `CustomerForm`, `InfoCard`,
>   `data.ts`) + `lib/customers.ts` + `lib/customer-form.ts` + `hooks/useCustomerForm.ts`.
>   Kelas `customer-*` (kecuali `customer-notes` milik `DialogNote`), `resource-customers`,
>   `detail-stat-strip`, `detail-info-grid`, dan `detail-related-records` dihapus.
> - Laporan: `components/reports/` (`ReportView`, `ReportActions`, `PeriodDialog`,
>   `ReportMetrics`, `RevenueChart`, `PaymentBreakdown`, `ReportTabs`, `ReportList`,
>   `ReportRow`, `InvoiceDialog`, `data.ts`) + `lib/reports.ts`. Popup periode memakai
>   `DialogTrigger` + `DialogBody`/`DialogFooter` (bukan popover native); unduhan CSV di
>   `app/(admin)/laporan/export/route.ts` memakai `reportCsv`/`reportFilename` yang sama.
>   Kelas `report-*`, `finance-*`, `payment-list*`, `invoice-detail`/`invoice-line`,
>   `report-period*`, `admin-panel*`, `admin-heading-actions*`, `account-popover`, serta
>   keluarga mati `report-table*`/`report-bar-*`/`finance-layout`/`finance-growth`/
>   `invoice-paid`/`invoice-total` dihapus; `.figma-list`, `.order-more-menu`, `.date-filter*`,
>   `.admin-heading`, dan `.sop-step` dipertahankan. Harness baru: `npm run check:reports`.
> - Audit log: `components/audit/` (`AuditLogView`, `AuditMetrics`, `AuditFilterBar`,
>   `AuditList`, `AuditEntry`, `AuditDetailDialog`, `AuditState`, `AuditActionBadge`,
>   `data.ts`) + `lib/audit.ts` (label kolom, nilai sebelum/sesudah, page count, rentang
>   halaman, hasFilter, admin hilang, status error). `app/audit.css` (84 aturan · 424 baris)
>   dihapus dan impornya dilepas dari `app/layout.tsx`; hex audit diganti token (`accent`,
>   `info`, `warning`, `danger`, `surface-soft`, `line`). `check:audit` diperluas untuk fungsi
>   murni baru.
> - Paginasi seragam: `lib/pagination.ts` (`PAGE_SIZE = 10`, `parsePage`, `paginate`,
>   `pageHref`, `pageWindow`) + `shared/ui/Pagination` (nomor halaman + elipsis, ringkasan
>   "Menampilkan a–b dari n"). Semua daftar di `ResourcePages` (pesanan, jadwal, layanan, FAQ,
>   customer, petugas) kini 10/halaman; `FaqPagination`/`paginateFaqs`/`faqPageHref` dihapus
>   dan audit memakai primitif yang sama. Metrik/tab tetap dari data penuh; filter/pencarian
>   mengosongkan `page`. `check:pagination` ditambahkan. Kartu pesanan: panel alamat+layanan+
>   harga dibagi dua kolom (alamat | layanan+harga), menumpuk di mobile.
> - CRUD petugas: `components/staff/StaffForm` (+ `StaffSkills`, `StaffMentor`, `data.ts`),
>   `lib/staff.ts` (status daftar, jadwal petugas, profil, ringkasan metrik, opsi form,
>   kandidat penugasan, label tanggal), `lib/staff-form.ts`, `hooks/useStaffForm.ts`.
>   `ResourceFormServer` jadi router per resource (tanpa `fieldsFor`); `ResourceForm` generik
>   dan `Form.tsx` dihapus, `SubmitButton` pindah ke `shared/ui/SubmitButton.tsx`. Dialog
>   penugasan pesanan memakai `components/orders/AssignmentForm.tsx`. Kelas `people-grid`,
>   `order-edit-summary`, dan `assignment-summary` dihapus.
>
> Kelas `button`, `notification-*`, `figma-*` (daftar lain), `.modal` varian, `.date-*`/
> `.calendar-*`, `.audit-*` masih legacy dan menunggu wave berikutnya.

## 9. Kontrak Tailwind CSS 4

`app/globals.css` menjadi satu-satunya file CSS: `@import "tailwindcss"`, satu blok
`@theme`, `@layer base` tipis, `@keyframes`, dan maksimal tiga `@utility`.

```css
@import 'tailwindcss';

@theme {
  /* warna (§2.1) */
  --color-canvas: #f5f8f6;
  --color-surface: #ffffff;
  --color-surface-soft: #fbfdfc;
  --color-surface-tint: #effaf5;
  --color-line: #dde6e1;
  --color-line-soft: #e4ece7;
  --color-line-strong: #bbead0;
  --color-ink: #16231d;
  --color-ink-soft: #34483e;
  --color-ink-muted: #596d63;
  --color-ink-meta: #65756d;
  --color-ink-faint: #809087;
  --color-accent: #0a805b;
  --color-accent-hover: #066647;
  --color-accent-active: #14b767;
  --color-accent-glow: #baf0d1;
  --color-accent-soft: #ecf7f1;
  --color-accent-bright: #20c875;
  --color-accent-ring: #81baa4;
  --color-success: #11985a;
  --color-success-soft: #e8fbf1;
  --color-warning: #91610c;
  --color-warning-soft: #fff5e5;
  --color-danger: #b94b42;
  --color-danger-soft: #fff1ed;
  --color-info: #156885;
  --color-info-soft: #e7f7fb;
  --color-neutral-soft: #edf1ee;

  /* tipografi (§3.2) */
  --font-sans: var(--font-body), sans-serif;
  --font-display: var(--font-heading), sans-serif;
  --text-xs: 12px;
  --text-xs--line-height: 1.5;
  --text-sm: 13px;
  --text-sm--line-height: 1.5;
  --text-base: 14px;
  --text-base--line-height: 1.5;
  --text-md: 15px;
  --text-md--line-height: 1.6;
  --text-lg: 16px;
  --text-lg--line-height: 1.5;
  --text-xl: 18px;
  --text-xl--line-height: 1.5;
  --text-2xl: 22px;
  --text-2xl--line-height: 1.3;
  --text-3xl: 26px;
  --text-3xl--line-height: 1.3;
  --text-4xl: 28px;
  --text-4xl--line-height: 1.3;
  --text-5xl: 32px;
  --text-5xl--line-height: 1.1;
  --text-6xl: 40px;
  --text-6xl--line-height: 1.1;
  --text-7xl: 56px;
  --text-7xl--line-height: 1;

  /* satu langkah spasi = 1px pada root 12px (§4) */
  --spacing: 0.083333rem;

  /* radius (§5) */
  --radius-sm: 6px;
  --radius-control: 8px;
  --radius-md: 10px;
  --radius-card: 12px;
  --radius-dialog: 16px;
  --radius-pill: 999px;

  /* bayangan (§6) */
  --shadow-card: 0 2px 4px rgb(24 60 43 / 0.07);
  --shadow-panel: 0 5px 18px rgb(39 70 54 / 0.03);
  --shadow-raised: 0 0.333rem 2rem rgb(23 56 41 / 0.04);
  --shadow-dialog: 0 20px 64px rgb(22 44 35 / 0.16);
  --shadow-popover: 0 12px 36px rgb(22 44 35 / 0.1);

  /* motion (§7) */
  --ease-cleango: cubic-bezier(0.2, 0.7, 0.3, 1);

  /* breakpoint dalam px, bukan rem: root font-size 75% (§4).
     +1px karena varian max-* Tailwind memakai batas eksklusif (`< nilai`),
     sedangkan CSS lama memakai `max-width` inklusif. */
  --breakpoint-sm: 701px;
  --breakpoint-md: 981px;
  --breakpoint-lg: 1151px;
  --breakpoint-xl: 1441px;
}
```

Aturan yang mengikat:

1. **Hanya token di atas.** Hex mentah, `rgb()`, atau `oklch()` di TSX ditolak guard
   `check:styling`.
2. **Nama `xs`…`7xl` sengaja menimpa default Tailwind** agar cocok dengan skala di §3.2,
   termasuk 13px dan 15px yang tidak ada di skala Tailwind bawaan.
3. **Satu langkah `--spacing` = 1px.** `p-12` = 12px. Jangan menghitung kelipatan 4.
4. **Desktop-first.** Pakai `max-sm:`/`max-md:`/`max-lg:`/`max-xl:` sesuai §4, bukan `md:`.
5. **Class harus literal.** `StatusBadge` memakai map objek berisi string penuh, bukan
   `'status-badge ' + tone()` seperti sekarang.
6. **Tidak ada `@layer components`.** Pola yang dipakai lebih dari dua tempat menjadi
   komponen React di `components/ui/`.

## 10. Utang teknis yang harus dibayar saat migrasi

Ini bukan preferensi; ini kondisi kode hari ini dan alasan migrasi dilakukan.

| Temuan                                         | Angka                                       | Dampak                                             |
| ---------------------------------------------- | ------------------------------------------- | -------------------------------------------------- |
| Selector didefinisikan di lebih dari satu file | **226**                                     | nilai efektif bergantung urutan import, bukan niat |
| `.button`                                      | **102 rule di 13 file**                     | satu perubahan tombol harus diuji di 13 tempat     |
| `.modal`                                       | **137 rule di 9 file**                      | idem untuk dialog                                  |
| Kelas dipakai lintas file                      | 241 dari 654                                | tidak ada batas kepemilikan komponen               |
| Kelas CSS tanpa pemakaian                      | **192 (29%)**                               | berat CSS dan risiko salah "perbaikan"             |
| Hex literal di luar token                      | 92 nilai / 166 pemakaian                    | perubahan tema tidak konsisten                     |
| Token bernilai duplikat                        | 43 token / 19 grup                          | `--text-10/11/12` identik                          |
| Spasi literal                                  | 464 deklarasi                               | langkah tidak terkontrol                           |
| `font-size` literal                            | 163 deklarasi                               | skala teks bocor                                   |
| Ukuran teks minimum                            | 11px                                        | di bawah batas baca 12px                           |
| Radius di luar skala                           | 5/7/9/11/13/14/18/20px                      | sudut tidak seragam                                |
| Durasi animasi tanpa token                     | 260ms, 280ms, 1.4s                          | sulit diselaraskan                                 |
| Nama kelas campuran                            | `figma-*`, `next-*`, `admin-*`, `managed-*` | dua generasi styling hidup bersama                 |

## 11. Aturan untuk kontributor dan agen

**Lakukan**

- Ambil warna, radius, ukuran teks dari §2, §3, §5, §6. Jika tidak ada padanannya,
  tanyakan dulu; jangan menambah token.
- Bentuk komponen baru di `components/ui/` dan pakai ulang.
- Uji dengan `npm run typecheck`, `npm run build`, `npm run check:styling`.

**Jangan**

- Menambah file `.css` (termasuk CSS Module dan `<style jsx>`).
- Menulis `className={'x ' + y}` atau template literal untuk kelas Tailwind.
- Menyalin hex dari `admin.css`/`design.css`; ambil dari §2.
- Mengubah semantik (`role`, `aria-*`, `popover`, `dialog`, `tabIndex`) saat memindahkan
  styling.

## 12. Cara memperbarui dokumen ini

Dokumen ini tidak butuh Figma. Untuk memeriksa ulang angkanya, jalankan analisis statis
terhadap `app/*.css` dan `components/**`:

```bash
# jumlah kelas, kelas tanpa pemakaian, selector yang bentrok
node scripts/audit-styles.mjs

# pemakaian token per peran (bg/teks/border/bayangan)
node scripts/audit-styles.mjs --tokens
```

Skrip `scripts/audit-styles.mjs` **belum ada**; ia ditulis pada wave W0 migrasi dan menjadi
sumber angka untuk §2.2 dan §10. Selama belum ada, angka dihitung manual dengan aturan yang
sama: deklarasi `properti: nilai;` di 13 file CSS (tanpa `tokens.css`), dikelompokkan per
peran properti.

Batas yang perlu diketahui:

- Angka "dipakai" dihitung dari teks CSS/TSX, bukan dari render; nilai efektif tetap harus
  dicek dengan urutan import di §0.
- Kelas yang dibentuk dinamis (`'status-badge ' + tone(...)`, `'delivery-badge delivery-' +
status`) dihitung sebagai tidak dipakai oleh sebagian pemeriksaan; 192 kelas tanpa
  pemakaian adalah batas atas, bukan angka pasti.
- Dokumen ini menggambarkan kondisi sebelum migrasi. Setelah W12 (semua CSS legacy dihapus),
  §2.2, §4, dan §10 harus diperbarui karena penyimpangannya sudah tidak ada.

## 13. Catatan migrasi bertahap (L0–L1: halaman login)

Migrasi dikerjakan per halaman sambil 13 file CSS lama tetap aktif. Urutan yang dipakai:

1. `@import 'tailwindcss'` + blok `@theme` di `app/globals.css` (paling atas).
2. Reset lama (`html`, `body`, `button`, `a`, heading, focus) dipindah ke `@layer base`
   agar utility Tailwind bisa menang; deklarasi tidak berubah.
3. Utility hanya dipakai di halaman yang dikonversi; CSS halaman itu dihapus.
4. Halaman lain tidak berubah karena CSS legacy berada di luar layer dan selalu menang
   atas utility.

Jebakan yang benar-benar terjadi dan cara menanganinya:

| Jebakan                                             | Gejala                                                                                                                   | Penanganan                                                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Token legacy bernama sama dengan namespace Tailwind | `--text-sm` (0.875rem) dan `--text-base` (1rem) di `:root` legacy menimpa nilai `@theme`, sehingga `text-base` jadi 12px | nama legacy diganti `--legacy-text-sm`; dua pemakaiannya di `globals.css` ikut diganti                              |
| Reset elemen legacy menang atas utility             | `main { padding: 28px 34px }` membuat halaman login ber-padding walau pakai `p-0`                                        | selector diubah menjadi `main:not(.login-page)`; class `login-page` **tetap** dipertahankan sebagai opt-out         |
| Preflight menghapus `margin: auto` pada `<dialog>`  | modal menempel di kiri atas, tidak ada backdrop                                                                          | tambah `dialog { margin: auto }` di `@layer base`                                                                   |
| Kelas komponen legacy mengunci ukuran               | `.cleango-logo { width:40px; height:40px }` menahan `size-[52px]`                                                        | utility `size-[52px]!` (important) sampai `.cleango-logo` dimigrasi                                                 |
| `::backdrop`                                        | masih benar setelah preflight                                                                                            | tidak perlu tindakan                                                                                                |
| Format CSS hasil skrip                              | baris campuran CRLF/LF membuat `format:check` gagal                                                                      | normalkan ke CRLF setelah pengeditan skrip                                                                          |
| Breakpoint `max-*` eksklusif                        | `max-sm:` tidak aktif di lebar tepat 700px, padahal CSS lama `max-width:700px` aktif                                     | nilai breakpoint di `@theme` ditulis +1px (701/981/1151/1441)                                                       |
| `querySelector` ke kelas shell                      | `AdminSidebar` mencari `.app-shell`, `Filters` mencari `.header`                                                         | state collapse jadi React di `AdminShell`; topbar memakai `data-topbar`                                             |
| Frame `main` milik halaman, bukan shell             | `main:not(.login-page)` membuat halaman login harus memakai class `login-page` sebagai opt-out                           | frame (1480 / 28-34 / 24 / 24-18) dipindah ke utility `AdminShell`; 5 aturan `main` dihapus                         |
| Kelas komponen sebagai pengunci ukuran              | `.cleango-logo` 40px menahan `size-[52px]` sampai dipaksa `!`                                                            | ukuran jadi prop `size` pada `CleanGoLogo`; `!` dihapus                                                             |
| Chrome dialog tersebar di 8 file                    | `.modal*`, `.close-button` 207 aturan; header/body/footer dipakai manual di 5 komponen                                   | `DialogHeader/Body/Footer/CloseButton` di `shared/ui`, base CSS dihapus, kelas lama tetap sebagai hook untuk varian |
| Utility bernomor vs `--spacing` 1px                 | `size-4` = **4px** (bukan 16px) sehingga ikon jadi titik; `size-3` = 3px                                                 | ukuran ikon ditulis px eksplisit: `size-[10px]`, `size-[14px]`, `size-20`                                           |
| Harness `scripts/check-*` mengimpor komponen nyata  | pemindahan file atau import barrel membuat resolver melempar `Unexpected import`                                         | resolusi berbasis nama modul + stub untuk `@/components/shared/ui(/*)`                                              |
| Kelas layout dipakai lintas halaman                 | `.metrics-grid`/`.order-metrics` menempel di 9 tempat; menghapusnya mengubah semua                                       | `MetricGrid` dengan prop `columns`; normalisasi padding kartu 13→20px (DESIGN §4)                                   |

Hasil L1: `admin.css` −94 blok, `design.css` −20, `management.css` −25, `overrides.css` −2
(total 752 baris, −12,2 KB CSS sumber); tidak ada lagi kelas `.login-*` yang dirender, dan
`main:not(.login-page)` adalah satu-satunya sisa kata "login" di CSS.

Untuk halaman berikutnya, ulangi pola yang sama: baca nilai efektif dari cascade → tulis
utility → hapus blok CSS halaman itu → screenshot sebelum/sesudah.
