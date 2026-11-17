import Image from 'next/image';
import type { RecordData } from '@/types';
import { rupiah } from '@/lib/resources';
import { serviceMediaUrl } from '@/lib/service-media';
import { RecordActions } from '@/components/RecordActions';
import { UiIcon } from '@/components/shared/ui';

/** Satu kartu layanan di daftar Kelola Layanan. */
export function ServiceCard({
  service,
  edit,
}: {
  service: RecordData;
  edit: (item: RecordData, label?: string) => React.ReactNode;
}) {
  const promotional = false;
  const price = Number(service.price ?? 0);
  const discount = Number(service.discountPrice ?? 0);
  const features = Array.isArray(service.features) ? service.features : [];
  return (
    <article className="flex min-w-0 flex-col rounded-card border border-line bg-surface p-16">
      <div className="flex items-start gap-14">
        {!!service.imageUrl && (
          <Image
            className="h-90 w-120 shrink-0 rounded-control object-cover"
            src={serviceMediaUrl(
              String(service.imageUrl),
              process.env.API_URL ? new URL(process.env.API_URL).origin : '',
            )}
            alt={String(service.name)}
            width={160}
            height={120}
            unoptimized
          />
        )}
        <div className="min-w-0">
          <span className="flex flex-wrap items-center gap-6 text-sm leading-[1.5] text-ink-muted">
            <span className="rounded-sm bg-surface-tint px-6 py-3 text-xs text-ink-soft">
              {String(service.packageLabel || service.category)}
            </span>
            · {service.active ? 'Aktif' : 'Nonaktif'}
            {promotional && (
              <span className="rounded-sm bg-warning-soft px-6 py-2 text-xs text-warning">
                Promo
              </span>
            )}
          </span>
          <h3 className="mt-6 text-lg leading-[1.5] font-semibold break-words text-ink">
            {String(service.name)}
          </h3>
          <p className="mt-4 text-base leading-[1.6] text-ink-muted">
            Durasi: {String(service.duration)}
          </p>
          <p className="mt-2 text-base leading-[1.6] break-words text-ink-muted">
            {String(service.description ?? '')}
          </p>
        </div>
      </div>
      <div className="mt-11 flex flex-wrap items-center gap-8">
        {features.map((feature) => (
          <span
            key={String(feature)}
            className="inline-flex min-h-24 items-center gap-5 rounded-[7px] border border-line bg-surface-soft px-8 py-4 text-sm text-ink-muted"
          >
            <UiIcon name="tick" className="size-[12px]" />
            {String(feature)}
          </span>
        ))}
      </div>
      <div className="mt-14 flex flex-wrap items-center justify-between gap-12 border-t border-line-faint pt-12">
        <div className="flex flex-col">
          {promotional && (
            <del className="text-xs text-ink-faint">{rupiah(price)}</del>
          )}
          <strong className="text-lg leading-[1.5] font-bold text-accent">
            {rupiah(promotional ? discount : price)}
          </strong>
          <small className="text-xs text-ink-muted">/sekali pengerjaan</small>
        </div>
        <RecordActions resource="services" record={service} edit={edit} />
      </div>
    </article>
  );
}
