import {
  scheduleShifts,
  shiftEndOf,
  shiftOf,
  startSlotOf,
  resources,
} from '@/lib/resources';
import type { RecordData, Schedule, Staff } from '@/types';

/** Urutan shift yang ditampilkan di papan jadwal. */
const SHIFT_NAMES = ['Shift Pagi', 'Shift Siang', 'Shift Sore'] as const;

const shiftHours: Record<string, string> = Object.fromEntries(
  scheduleShifts.map((shift) => [shift.name, shift.time]),
);

export type ShiftGroup = {
  shift: string;
  hours: string;
  schedules: Schedule[];
  count: number;
  /** Kartu ajakan hanya muncul saat shift kosong atau ganjil. */
  showEmptyCard: boolean;
};

/** Tanggal hari ini menurut zona waktu Jakarta (format en-CA). */
function todayInJakarta() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
  }).format(new Date());
}

/** Rapikan baris jadwal: teks tanggal/petugas + urutan tanggal terbaru. */
export function normalizeScheduleRows<T extends RecordData>(records: T[]): T[] {
  return records
    .map((record) => ({
      ...record,
      date: String(record.date),
      staff: String(record.staff),
    }))
    .sort(
      (a, b) =>
        String(b.date).localeCompare(String(a.date)) ||
        String(a.staff).localeCompare(String(b.staff)),
    );
}

/** Kelompokkan jadwal per shift sesuai tab aktif. */
export function groupSchedulesByShift(
  shown: RecordData[],
  tab: string,
): ShiftGroup[] {
  return SHIFT_NAMES.filter((shift) => !tab || shift === tab).map((shift) => {
    const schedules = shown.filter(
      (item) => shiftOf(String(item.time)) === shift,
    ) as Schedule[];
    return {
      shift,
      hours: shiftHours[shift],
      schedules,
      count: schedules.length,
      showEmptyCard: schedules.length === 0 || schedules.length % 2 === 1,
    };
  });
}

/** Slot mulai/selesai bawaan untuk sebuah jam shift. */
function shiftSlotDefaults(time: string) {
  return {
    start: startSlotOf(time),
    end: shiftEndOf(time) ?? '12:00',
  };
}

/** Gabungkan jam mulai dan selesai menjadi teks shift. */
export function composeShiftTime(start: string, end: string) {
  return start.replace(':', '.') + '–' + end.replace(':', '.') + ' WIB';
}

/** Nilai awal form tambah/ubah jadwal. */
export function scheduleFormValues({
  schedule,
  staff,
  today = todayInJakarta(),
}: {
  schedule?: Schedule;
  staff: Staff[];
  today?: string;
}): Record<string, string> {
  const time = schedule?.time ?? scheduleShifts[0].time;
  const slots = shiftSlotDefaults(time);
  return {
    date: schedule?.date ?? today,
    time,
    start: slots.start,
    end: slots.end,
    staff:
      schedule?.staff ??
      staff.find((person) => ['Tersedia', 'Bertugas'].includes(person.status))
        ?.name ??
      '',
    status: schedule?.status ?? 'Terjadwal',
  };
}

/** Petugas yang bisa dipilih untuk shift ini (yang sekarang tetap ditampilkan). */
export function scheduleStaffOptions(staff: Staff[], current?: string) {
  return [
    ...new Set([
      ...staff
        .filter(
          (person) =>
            person.name === current ||
            ['Tersedia', 'Bertugas'].includes(person.status),
        )
        .map((person) => person.name),
    ]),
  ];
}

/** Opsi status jadwal dari konfigurasi resource. */
export function scheduleStatusOptions() {
  return (
    resources.schedules.fields.find((field) => field.name === 'status')
      ?.options ?? []
  );
}
