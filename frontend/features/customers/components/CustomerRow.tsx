import type { RecordData } from '@/types';
import { displayId } from '@/lib/display';
import { rupiah, valueText } from '@/lib/resources';
import { Button, StatusBadge, buttonVariants } from '@/components/ui';
import { RecordActions } from '@/components/RecordActions';

/** Baris daftar customer: tanggal bergabung, statistik, dan WhatsApp. */
export function CustomerRow({
  item,
  edit,
}: {
  item: RecordData;
  edit: (item: RecordData, label?: string) => React.ReactNode;
}) {
  const joined =
    item.joined && Number.isFinite(Date.parse(String(item.joined)))
      ? new Date(String(item.joined)).toLocaleDateString('id-ID', {
          month: 'long',
          year: 'numeric',
          timeZone: 'Asia/Jakarta',
        })
      : '—';
  const demo = String(item.id).startsWith('DEMO-');
  return (
    <article className="flex min-w-0 flex-col rounded-card border border-line bg-surface p-16">
      <div className="min-w-0">
        <span className="flex flex-wrap items-center gap-5 text-sm leading-[1.5] text-ink-muted">
          #{displayId(item.id)} · Terdaftar sejak {joined}
          {typeof item.active === 'boolean' && (
            <StatusBadge status={item.active ? 'Aktif' : 'Nonaktif'} />
          )}
        </span>
        <h3 className="mt-7 flex items-center gap-8 text-lg leading-[1.5] font-semibold">
          {valueText(item.name)}
        </h3>
        <p className="mt-6 text-base leading-[1.6] break-words text-ink-muted">
          WhatsApp: {valueText(item.phone)} · {valueText(item.email)}
        </p>
        <div className="mt-11 flex flex-wrap gap-6 text-sm text-ink-muted">
          <span className="rounded-sm bg-canvas px-7 py-5 break-words">
            {Number(item.orderCount ?? 0)} Pesanan
          </span>
          <span className="rounded-sm bg-canvas px-7 py-5 break-words">
            Nilai pesanan selesai {rupiah(Number(item.totalSpent ?? 0))}
          </span>
          <span className="rounded-sm bg-canvas px-7 py-5 break-words">
            {item.area
              ? 'Area: ' + valueText(item.area)
              : valueText(item.address)}
          </span>
        </div>
      </div>
      <div className="mt-16 w-full border-t border-line pt-14">
        <RecordActions resource="customers" record={item} edit={edit}>
          {demo ? (
            <Button variant="ghost" disabled>
              WhatsApp belum terhubung
            </Button>
          ) : (
            <a
              className={buttonVariants({ variant: 'ghost' })}
              href={
                'https://wa.me/' +
                String(item.phone).replace(/\D/g, '').replace(/^0/, '62')
              }
              target="_blank"
              rel="noreferrer"
            >
              Hubungi WhatsApp
            </a>
          )}
        </RecordActions>
      </div>
    </article>
  );
}
