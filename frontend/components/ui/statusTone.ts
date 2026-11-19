type StatusTone = 'green' | 'blue' | 'amber' | 'red' | 'neutral';

const TONES: Record<StatusTone, { bg: string; text: string }> = {
  green: { bg: 'bg-success-soft', text: 'text-accent-hover' },
  blue: { bg: 'bg-info-soft', text: 'text-info' },
  amber: { bg: 'bg-warning-soft', text: 'text-warning' },
  red: { bg: 'bg-danger-soft', text: 'text-danger' },
  neutral: { bg: 'bg-neutral-soft', text: 'text-ink-muted' },
};

/** Status bisnis → varian warna badge. */
export function statusTone(status: string) {
  if (status === 'Batal') return TONES.red;
  if (status === 'Nonaktif') return TONES.neutral;
  if (
    status === 'Aktif' ||
    status === 'Selesai' ||
    status === 'Tersedia' ||
    status === 'Siaga & Tersedia'
  )
    return TONES.green;
  if (
    status === 'Menunggu Lokasi' ||
    status === 'Menuju Lokasi' ||
    status === 'Sedang Dikerjakan' ||
    status === 'Berlangsung' ||
    status === 'Bertugas' ||
    status === 'Sedang Bekerja'
  )
    return TONES.blue;
  return TONES.amber;
}
