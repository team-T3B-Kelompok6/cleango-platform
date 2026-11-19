# Aturan `features/staff/`

Kelola Data Petugas: daftar, detail, form, keahlian, dan mentor.

## Isi

| Berkas                                                      | Lapisan | Isi                                                   |
| ----------------------------------------------------------- | ------- | ----------------------------------------------------- |
| `api/staffApi.ts`                                           | server  | `getStaff`, `getStaffMember`                          |
| `components/StaffList.tsx`                                  | server  | dispatcher daftar (`RecordListProps`)                 |
| `components/StaffRow.tsx`                                   | server  | baris petugas + aksi (termasuk Pantau Petugas)        |
| `components/StaffDetailServer.tsx`                          | server  | perangkai detail + modal                              |
| `components/StaffDetail.tsx`                                | server  | profil petugas                                        |
| `components/StaffDetailModal.tsx` / `StaffDetailFooter.tsx` | client  | kerangka dialog detail                                |
| `components/StaffForm.tsx`                                  | client  | form tambah/ubah                                      |
| `components/StaffPhotoField.tsx`                            | client  | unggah foto                                           |
| `components/StaffSkills.tsx` / `StaffMentor.tsx`            | client  | keahlian dan mentor                                   |
| `components/StaffPhone.tsx`                                 | server  | tautan WhatsApp                                       |
| `data/staffStyles.ts`                                       | data    | kelas bersama                                         |
| `data/staffFormPayload.ts`                                  | data    | `staffFormValues`, `appendStaffForm`, status training |
| `hooks/useStaffForm.ts`                                     | client  | state form + unggah foto                              |
| `index.ts`                                                  | barrel  | dipakai halaman `/petugas`, `ResourcePages`, form     |

## Aturan

1. **Perhitungan tetap di `lib/staff.ts`** (status operasional, tab, kandidat penugasan,
   ringkasan, profil, label tanggal) karena dipakai pesanan, jadwal, dan tracking. Jangan
   menyalinnya ke fitur ini.
2. **Foto petugas lewat `lib/staff-photo.ts`** dan unggah lewat `lib/service-image.ts`.
3. **`StaffAvatar` tinggal di `components/ui/StaffAvatar.tsx`** karena dipakai baris pesanan,
   editor jadwal, dan form penugasan.
4. **Pantau Petugas memakai `@/components/tracking`** — jangan membuat tombol/dialog baru di
   fitur ini.
5. **Mentor dan keahlian divalidasi di server**; hook hanya untuk UX.
6. **Jangan menambah field baru tanpa memperbarui** `staffFormPayload`, `lib/staff.ts`, dan
   backend `/staff`.
