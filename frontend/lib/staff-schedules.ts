import type { Order, Schedule, Staff } from '@/types';

export function timeRange(value: string): [number, number] | null {
  const match =
    /^(\d{1,2})[:.](\d{2})\s*[–—-]\s*(\d{1,2})[:.](\d{2})(?:\s*WIB)?$/.exec(
      value.trim(),
    );
  if (!match) return null;
  const [startHour, startMinute, endHour, endMinute] = match
    .slice(1)
    .map(Number);
  if (startHour > 23 || endHour > 23 || startMinute > 59 || endMinute > 59)
    return null;
  const start = startHour * 60 + startMinute,
    end = endHour * 60 + endMinute;
  return end > start ? [start, end] : null;
}
export function overlaps(left: string, right: string) {
  const a = timeRange(left),
    b = timeRange(right);
  return !!a && !!b && a[0] < b[1] && b[0] < a[1];
}
export function scheduleCovers(
  schedule: Schedule,
  order: Pick<Order, 'date' | 'time' | 'staff'>,
) {
  const shift = timeRange(schedule.time),
    task = timeRange(order.time);
  return (
    schedule.date === order.date &&
    order.staff.includes(schedule.staff) &&
    !!shift &&
    !!task &&
    shift[0] <= task[0] &&
    shift[1] >= task[1]
  );
}
export function linkedOrders(schedule: Schedule, orders: Order[]) {
  return orders.filter(
    (order) => order.status !== 'Batal' && scheduleCovers(schedule, order),
  );
}
export function assignmentIssue(
  person: Staff,
  order: Order,
  _schedules: Schedule[],
  orders: Order[],
) {
  if (!['Tersedia', 'Bertugas'].includes(person.status))
    return 'Petugas sedang tidak tersedia.';
  const existing = orders
    .find((item) => item.id === order.id)
    ?.staff.includes(person.name);
  if (person.status === 'Bertugas' && !existing)
    return 'Petugas sedang bertugas.';
  if (
    orders.some((other) => {
      if (other.id === order.id || !other.staff.includes(person.name))
        return false;
      if (['Selesai', 'Batal'].includes(other.status)) return false;
      const stage = other.staffProgress?.find(
        (item) => item.staffName === person.name,
      )?.stage;
      return stage
        ? ['en_route', 'working'].includes(stage)
        : ['Menuju Lokasi', 'Sedang Dikerjakan'].includes(other.status);
    })
  )
    return 'Petugas masih menjalankan tugas lain.';
  // A shift is optional: many cleaners have no schedule rows yet. Overlap and
  // duty checks below still block real conflicts, and the backend re-validates.
  const candidate = { ...order, staff: [person.name] };
  void candidate;
  if (
    orders.some(
      (other) =>
        other.id !== order.id &&
        !['Batal', 'Selesai'].includes(other.status) &&
        other.date === order.date &&
        other.staff.includes(person.name) &&
        other.staffProgress?.find((item) => item.staffName === person.name)
          ?.stage !== 'completed' &&
        overlaps(other.time, order.time),
    )
  )
    return 'Sudah ditugaskan pada pesanan lain di jam yang sama.';
  return '';
}
export function scheduleIssue(
  schedule: Schedule,
  schedules: Schedule[],
  orders: Order[],
  previous?: Schedule,
) {
  if (!timeRange(schedule.time))
    return 'Isi rentang jam yang valid, misalnya 08.00–12.00 WIB.';
  if (
    schedule.status !== 'Nonaktif' &&
    schedules.some(
      (other) =>
        other.id !== schedule.id &&
        other.status !== 'Nonaktif' &&
        other.staff === schedule.staff &&
        other.date === schedule.date &&
        overlaps(other.time, schedule.time),
    )
  )
    return 'Petugas sudah memiliki shift pada tanggal dan jam yang bertumpuk.';
  const active = previous
    ? linkedOrders(previous, orders).filter(
        (order) => order.status !== 'Selesai',
      )
    : [];
  if (
    active.some(
      (order) =>
        !['Terjadwal', 'Berlangsung'].includes(schedule.status) ||
        !scheduleCovers(schedule, order),
    )
  )
    return 'Shift masih dipakai pesanan aktif. Pindahkan penugasan pesanan terlebih dahulu.';
  return '';
}
