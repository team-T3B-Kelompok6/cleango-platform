export function time(value?: string) {
  return value
    ? new Date(value).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      }) + ' WIB'
    : 'Menunggu';
}

export function date(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
}

export function duration(seconds: number) {
  const n = Math.max(0, Math.floor(seconds));
  return [Math.floor(n / 3600), Math.floor(n / 60) % 60, n % 60]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

export function requestKey() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    Date.now().toString(36) + '_' + Math.random().toString(36).slice(2)
  );
}

export const demoCleanerLocations: Record<string, [number, number]> = {
  'DEMO-ORD-01': [-7.94974, 112.63092],
  'DEMO-ORD-02': [-7.98018, 112.63063],
  'DEMO-ORD-03': [-7.96792, 112.65354],
};
