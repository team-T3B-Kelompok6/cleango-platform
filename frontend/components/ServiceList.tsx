import { rupiah } from '@/lib/resources';
import Image from 'next/image';

import { UiIcon } from './UiIcon';
import { RecordActions } from './RecordActions';

import type { Service } from '@/types';
import type { RecordListProps } from './RecordListProps';
export function ServiceList({ shown, resource, edit }: RecordListProps) {
  return (
    <>
      {resource === 'services' &&
        shown.map((item) => {
          const service = item as Service;
          const promotional = false;
          return (
            <article key={service.id} className="figma-service-row">
              <div className="figma-service-top">
                {service.imageUrl && (
                  <Image
                    className="service-list-image"
                    src={service.imageUrl}
                    alt={service.name}
                    width={160}
                    height={120}
                    unoptimized
                  />
                )}
                <div>
                  <span className="figma-kicker">
                    <span className="service-package">
                      {service.packageLabel || service.category}
                    </span>{' '}
                    · {service.active ? 'Aktif' : 'Nonaktif'}
                    {promotional && (
                      <span className="service-promo-badge">Promo</span>
                    )}
                  </span>
                  <h3>{service.name}</h3>
                  <p>Durasi: {service.duration}</p>
                  <p className="service-list-description">
                    {service.description}
                  </p>
                </div>
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
                  {promotional && <del>{rupiah(service.price)}</del>}
                  <strong>
                    {rupiah(
                      promotional ? service.discountPrice! : service.price,
                    )}
                  </strong>
                  <small>/sekali pengerjaan</small>
                </div>
                <RecordActions
                  resource={resource}
                  record={service}
                  edit={edit}
                ></RecordActions>
              </div>
            </article>
          );
        })}
    </>
  );
}
