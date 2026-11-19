# Aturan `features/schedules/`

Kelola Jadwal: papan shift (baca) + editor shift (tambah/ubah).

## Isi

| Berkas                          | Lapisan | Isi                                                                      |
| ------------------------------- | ------- | ------------------------------------------------------------------------ |
| `api/schedulesApi.ts`           | server  | `getSchedules`, `getSchedule`                                            |
| `data/scheduleRules.ts`         | data    | `normalizeScheduleRows`, `groupSchedulesByShift`, opsi shift/status/form |
| `data/scheduleStyles.ts`        | data    | kelas papan shift                                                        |
| `hooks/useScheduleEditor.ts`    | client  | state editor + validasi                                                  |
| `components/ScheduleBoard.tsx`  | server  | pengelompok per shift                                                    |
| `components/ShiftSection.tsx`   | server  | satu shift + kartu                                                       |
| `components/ShiftCard.tsx`      | server  | satu jadwal + aksi                                                       |
| `components/EmptyShiftCard.tsx` | server  | slot kosong                                                              |
| `components/ScheduleEditor.tsx` | client  | form tambah/ubah jadwal                                                  |
| `index.ts`                      | barrel  | dipakai `ResourcePages` dan `ResourceFormServer`                         |

## Aturan

1. **Normalisasi baris di `scheduleRules`**, bukan di komponen. Baris lama bisa berbentuk
   objek; jangan menambah cabang bentuk baru di `.tsx`.
2. **Slot jam dari `bookingStartSlots` (`lib/resources`)**, jangan menulis ulang daftar jam.
3. **Editornya dipakai resource `schedules`**; `OrderEditor` tetap di
   `components/booking/editors/` karena milik fitur pesanan. `CancelButton`, `Field`,
   `FormFeedback`, dan `data.ts` editor tetap di sana dan diimpor dari fitur ini.
4. **Shift yang masih dipakai pesanan aktif tidak boleh dihapus** — aturan ada di
   `deleteAction`; jangan menduplikasi di UI.
5. **Jangan menambah state global** untuk board; cukup props dari `ResourcePages`.
