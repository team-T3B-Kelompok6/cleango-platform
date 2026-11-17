import type { AdminCleanerTask, TaskBoard } from '@/types/cleaner';

export type BoardStaff = NonNullable<TaskBoard['staff']>[number];

export type StaffGroup = {
  key: string;
  items: AdminCleanerTask[];
  person?: BoardStaff;
};

/** ISO waktu mulai tugas menurut jadwal pesanan (WIB). */
export function scheduledAt(item: AdminCleanerTask) {
  const start = item.time.match(/(\d{1,2})[.:](\d{2})/);
  if (!start) return null;
  const value = new Date(
    `${item.date}T${start[1].padStart(2, '0')}:${start[2]}:00+07:00`,
  );
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function stagePriority(item: AdminCleanerTask) {
  return item.task?.stage === 'working'
    ? 3
    : item.task?.stage === 'en_route'
      ? 2
      : item.task?.stage === 'assigned'
        ? 1
        : 0;
}

/** Tugas yang sedang dikerjakan lebih dulu, lalu jadwal terbaru. */
export function sortTasks(items: AdminCleanerTask[]) {
  return [...items].sort(
    (a, b) =>
      stagePriority(b) - stagePriority(a) ||
      (b.date + b.time).localeCompare(a.date + a.time),
  );
}

/** Tugas dengan titik GPS terbaru, dipakai untuk tombol lokasi. */
export function latestLocatedTask(items: AdminCleanerTask[]) {
  return (
    [...items]
      .filter((row) => row.task?.location)
      .sort((a, b) =>
        b.task!.location!.updatedAt.localeCompare(a.task!.location!.updatedAt),
      )[0] ?? null
  );
}

/** Hitung tugas yang masih berjalan (belum selesai/batal). */
export function activeTaskCount(items: AdminCleanerTask[]) {
  return items.filter(
    (row) =>
      !['Selesai', 'Batal'].includes(row.orderStatus) &&
      (row.task
        ? ['en_route', 'working'].includes(row.task.stage)
        : ['Menuju Lokasi', 'Sedang Dikerjakan'].includes(row.orderStatus)),
  ).length;
}

/**
 * Kelompokkan penugasan per petugas, termasuk petugas tanpa tugas.
 * Urutan mengikuti kemunculan di board; filter nama memakai pencarian bebas.
 */
export function groupTasks(
  board: TaskBoard | null,
  {
    initialName,
    initialOrderId,
    search,
  }: { initialName?: string; initialOrderId?: string; search: string },
): StaffGroup[] {
  const grouped = new Map<string, AdminCleanerTask[]>();
  for (const item of board?.items ?? []) {
    if (
      initialOrderId
        ? item.orderId !== initialOrderId
        : initialName && item.staffName !== initialName
    )
      continue;
    const key = item.staffId || item.staffName;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  for (const person of board?.staff ?? []) {
    if (initialOrderId || (initialName && person.name !== initialName))
      continue;
    if (!grouped.has(person.id)) grouped.set(person.id, []);
  }
  const needle = search.toLowerCase().trim();
  return [...grouped.entries()]
    .map(([key, items]) => ({
      key,
      items,
      person: board?.staff?.find((person) => person.id === key),
    }))
    .filter((group) =>
      (group.items[0]?.staffName ?? group.person?.name ?? '')
        .toLowerCase()
        .includes(needle),
    );
}
