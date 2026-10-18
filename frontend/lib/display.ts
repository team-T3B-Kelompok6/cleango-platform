// Keep sample storage keys stable; present short operational references in UI.
export function displayId(id: string) {
  if (!id.startsWith('DEMO-')) return id;
  const sample = /^DEMO-(ORD|CHECK|HISTORY|ACTIVE|PT|CUS|SRV|JD)-(\d+)$/.exec(
    id,
  );
  if (sample) {
    const [, kind, number] = sample;
    const orderOffsets: Record<string, number> = {
      ORD: 8900,
      CHECK: 9000,
      HISTORY: 8800,
      ACTIVE: 9100,
    };
    return kind in orderOffsets
      ? 'CL-' + (orderOffsets[kind] + Number(number))
      : ({ PT: 'PT', CUS: 'CS', SRV: 'SRV', JD: 'JD' }[kind] ?? 'CL') +
          '-' +
          number.padStart(2, '0');
  }
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const prefix = /PT|STAFF/.test(id)
    ? 'PT'
    : /CUS/.test(id)
      ? 'CS'
      : /SRV|SERVICE/.test(id)
        ? 'SRV'
        : /JD|SCHEDULE/.test(id)
          ? 'JD'
          : 'CL';
  return prefix + '-' + hash.toString(36).toUpperCase();
}
