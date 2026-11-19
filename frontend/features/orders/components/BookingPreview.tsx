import type { Order, RecordData } from '@/types';
import { displayId } from '@/lib/display';
import { rupiah } from '@/lib/resources';
import { bookingStart, workTimeRange } from '@/lib/order-flow';
import { StatusBadge } from '@/components/ui';

type BookingRecord = RecordData & {
  staff?: string | string[];
  address?: unknown;
  notes?: unknown;
  price?: unknown;
  date?: unknown;
  time?: unknown;
  service?: unknown;
  customer?: unknown;
  status?: unknown;
};

function dateText(value: unknown) {
  if (!value) return '';
  const raw = String(value);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeZone: 'Asia/Jakarta',
  }).format(parsed);
}

/** Rincian pesanan/jadwal di dalam dialog maupun halaman detail. */
export function BookingPreview({
  resource,
  record,
}: {
  resource: 'orders' | 'schedules';
  record: BookingRecord;
}) {
  const schedule = resource === 'schedules';
  const values: [string, string][] = schedule
    ? [
        ['Petugas', String(record.staff || 'Belum ditugaskan')],
        ['Tanggal', dateText(record.date)],
        ['Jam shift', String(record.time)],
        ['Status jadwal', String(record.status)],
      ]
    : [
        ['Pelanggan', String(record.customer)],
        ['Layanan', String(record.service)],
        ['Tanggal', dateText(record.date)],
        ['Jam booking', bookingStart(record as Order)],
        ...(record.status === 'Selesai'
          ? [
              [
                'Jam pengerjaan',
                workTimeRange(record as Order) ||
                  'Waktu mulai–selesai belum tercatat',
              ] as [string, string],
            ]
          : []),
        [
          'Petugas',
          ((record as Order).staff ?? []).join(' & ') || 'Belum ditugaskan',
        ],
        ['Total biaya', rupiah(Number(record.price))],
      ];

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <strong className="text-xl font-bold text-ink">
          #{displayId(String(record.id))}
        </strong>
        <StatusBadge status={String(record.status)} />
      </div>
      <dl className="m-0 block">
        {values.map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-[170px_1fr] gap-20 border-b border-line-faint py-15 max-sm:grid-cols-1 max-sm:gap-6"
          >
            <dt className="text-base text-ink-meta">{label}</dt>
            <dd className="m-0 text-md font-medium break-words text-ink">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {!schedule && (
        <>
          <section className="flex flex-col gap-8">
            <h3 className="font-display text-md leading-[1.5] font-bold text-ink">
              Alamat pengerjaan
            </h3>
            <p className="text-base leading-[1.7] text-ink-muted break-words">
              {String(record.address || 'Belum tersedia')}
            </p>
          </section>
          <section className="flex flex-col gap-8">
            <h3 className="font-display text-md leading-[1.5] font-bold text-ink">
              Catatan pelanggan
            </h3>
            <p className="text-base leading-[1.7] whitespace-pre-line text-ink-muted break-words">
              {typeof record.notes === 'string' && record.notes.trim()
                ? record.notes
                : 'Tidak ada catatan pelanggan untuk pesanan ini.'}
            </p>
          </section>
        </>
      )}
    </>
  );
}
