export function estimateWorkCompletion(
  startedAt: string | Date | number | null | undefined,
  minutes: number | null | undefined,
): string | null {
  if (
    !startedAt ||
    typeof minutes !== 'number' ||
    !Number.isFinite(minutes) ||
    minutes <= 0
  )
    return null;
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) return null;
  const end = start + minutes * 60000;
  return Number.isFinite(end) && Math.abs(end) <= 8.64e15
    ? new Date(end).toISOString()
    : null;
}
