import Image from 'next/image';
import type { Service } from '@/types';
import { rupiah } from '@/lib/resources';
import { serviceMediaUrl } from '@/lib/service-media';
import { StatusBadge, UiIcon } from '@/components/ui';

/** Pratinjau layanan di dialog detail. */
export function ServicePreview({ service }: { service: Service }) {
  const promo = false;
  return (
    <>
      {service.imageUrl ? (
        <Image
          className="aspect-[16/9] w-full rounded-card object-cover"
          src={serviceMediaUrl(
            service.imageUrl,
            process.env.API_URL ? new URL(process.env.API_URL).origin : '',
          )}
          alt={service.name}
          width={800}
          height={450}
          unoptimized
        />
      ) : (
        <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-8 rounded-card border border-dashed border-line bg-canvas text-xs text-ink-muted">
          <UiIcon name="image" className="size-24" />
          <span>Foto layanan belum ditambahkan</span>
        </div>
      )}
      <div className="flex items-start justify-between gap-12">
        <div className="min-w-0">
          <span className="text-xs tracking-[0.03em] text-ink-muted uppercase">
            {service.category}
          </span>
          <h3 className="text-xl leading-[1.3] font-bold break-words text-ink">
            {service.name}
          </h3>
        </div>
        <StatusBadge status={service.active ? 'Aktif' : 'Nonaktif'} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-12 rounded-card border border-line bg-surface-soft p-12">
        <div className="flex flex-items-baseline items-baseline gap-6">
          {promo && (
            <del className="text-sm text-ink-faint">
              {rupiah(service.price)}
            </del>
          )}
          <strong className="text-xl font-bold text-accent">
            {rupiah(promo ? service.discountPrice! : service.price)}
          </strong>
          <small className="text-xs text-ink-muted">/ sesi</small>
        </div>
        <span className="flex items-center gap-6 text-sm text-ink-muted">
          <UiIcon name="clock" className="size-[14px]" />
          {service.duration}
        </span>
      </div>
      <section className="flex flex-col gap-8">
        <h3 className="text-sm font-semibold text-ink">Deskripsi layanan</h3>
        <p className="text-base leading-[1.6] whitespace-pre-line text-ink-muted">
          {service.description || 'Deskripsi belum ditambahkan.'}
        </p>
      </section>
      <section className="flex flex-col gap-8">
        <h3 className="text-sm font-semibold text-ink">Fasilitas termasuk</h3>
        {service.features?.length ? (
          <ul className="grid gap-6 text-sm text-ink-muted">
            {service.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-6">
                <UiIcon name="tick" className="mt-3 size-[14px] text-accent" />
                {feature}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-base leading-[1.6] text-ink-muted">
            Fasilitas belum ditambahkan.
          </p>
        )}
      </section>
    </>
  );
}
