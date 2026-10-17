import type { RecordData } from '@/types';

function orderCreatedTime(order: RecordData): number {
  let latest = 0;
  for (const value of [
    order.activityAt,
    order.updatedAt,
    order.updated_at,
    order.departedAt,
    order.arrivedAt,
    order.startedAt,
    order.completedAt,
    order.createdAt,
    order.created_at,
  ]) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp)) latest = Math.max(latest, timestamp);
  }
  return (
    latest ||
    (Number.isFinite(Date.parse(String(order.date)))
      ? Date.parse(String(order.date))
      : 0)
  );
}

export function orderStatusLabel(status: string): string {
  return status === 'Menunggu Lokasi' ? 'Siap Berangkat' : status;
}

export function newestOrderFirst(a: RecordData, b: RecordData): number {
  return orderCreatedTime(b) - orderCreatedTime(a);
}

export function bookingStart(order: RecordData): string {
  const match = /^(\d{1,2})[:.](\d{2})(?=\s|[–—-]|$)/.exec(
    String(order.time ?? '').trim(),
  );
  return match && Number(match[1]) < 24 && Number(match[2]) < 60
    ? match[1].padStart(2, '0') + '.' + match[2] + ' WIB'
    : 'Belum tersedia';
}

export function workTimeRange(order: RecordData): string | null {
  if (order.status !== 'Selesai') return null;
  const start = Date.parse(String(order.startedAt ?? order.started_at ?? ''));
  const end = Date.parse(String(order.completedAt ?? order.completed_at ?? ''));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
    return null;
  const clock = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Jakarta',
  });
  const day = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
  return day.format(start) === day.format(end)
    ? clock.format(start) + '–' + clock.format(end) + ' WIB'
    : day.format(start) +
        ' ' +
        clock.format(start) +
        ' – ' +
        day.format(end) +
        ' ' +
        clock.format(end) +
        ' WIB';
}

export function orderTimeText(order: RecordData): string {
  return order.status === 'Selesai'
    ? 'Pengerjaan ' + (workTimeRange(order) || 'belum tercatat')
    : 'Booking ' + bookingStart(order);
}

export function needsAssignment(order: RecordData): boolean {
  return (
    ['Menunggu Assign', 'Menunggu Lokasi'].includes(String(order.status)) &&
    (!Array.isArray(order.staff) || order.staff.length === 0)
  );
}
