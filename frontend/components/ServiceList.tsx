import Link from 'next/link';
import { rupiah } from '@/lib/resources';

import { UiIcon } from './UiIcon';

import type { Service } from '@/types';
import type { RecordListProps } from './RecordListProps';
export function ServiceList({
  shown,
  resource,
  config,
  edit,
}: RecordListProps) {
  return (
    <>
      {resource === 'services' &&
        shown.map((item) => {
          const service = item as Service;
          return (
            <article key={service.id} className="figma-service-row">
              <div className="figma-service-top">
                <div>
                  <span className="figma-kicker">
                    <span className="service-package">
                      {service.packageLabel || service.category}
                    </span>{' '}
                    · {service.active ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <h3>{service.name}</h3>
                  <p>Durasi: {service.duration}</p>
                </div>
                <small>#{service.id}</small>
              </div>
              <div className="figma-feature-list">
                {service.features?.map((feature) => (
                  <span key={feature}>
                    <UiIcon name="tick" />
                    {feature}
                  </span>
                ))}
              </div>
              <div className="figma-service-bottom">
                <div className="service-price">
                  <strong>{rupiah(service.price)}</strong>
                  <small>/sekali pengerjaan</small>
                </div>
                <div className="figma-row-actions">
                  {edit(service, 'Ubah Harga & Edit')}
                  <Link
                    className="button"
                    href={config.path + '/' + encodeURIComponent(service.id)}
                  >
                    Detail Layanan
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
    </>
  );
}
