import Link from 'next/link';
import { valueText, rupiah } from '@/lib/resources';
import { Badge } from './StatusBadge';
import { UiIcon } from './UiIcon';
import { TrackingButton } from './tracking/TrackingButton';

import type { RecordListProps } from './RecordListProps';
export function PeopleList({ shown, resource, config, edit }: RecordListProps) {
  return (
    <>
      {(resource === 'staff' || resource === 'customers') &&
        shown.map((item) => (
          <article key={item.id} className="figma-person-row">
            <div className="figma-person-main">
              <span className="figma-person-meta">
                #{item.id} ·{' '}
                {resource === 'staff' ? (
                  <Badge
                    status={
                      item.status === 'Tersedia'
                        ? 'Siaga & Tersedia'
                        : item.status === 'Bertugas'
                          ? 'Sedang Bekerja'
                          : valueText(item.status)
                    }
                  />
                ) : (
                  'Terdaftar sejak ' +
                  (item.joined
                    ? new Date(String(item.joined)).toLocaleDateString(
                        'id-ID',
                        {
                          month: 'long',
                          year: 'numeric',
                          timeZone: 'Asia/Jakarta',
                        },
                      )
                    : '—')
                )}
              </span>
              <h3>
                {valueText(item.name)}
                {resource === 'staff' && typeof item.rating === 'number' && (
                  <span className="staff-rating">
                    <UiIcon name="star" />
                    {item.rating.toFixed(1)}
                  </span>
                )}
              </h3>
              <p>
                WhatsApp: {valueText(item.phone)} ·{' '}
                {resource === 'staff' && 'Wilayah: '}
                {valueText(resource === 'staff' ? item.area : item.email)}
              </p>
              {resource === 'staff' ? (
                <div className="figma-feature-list">
                  {Array.isArray(item.skills) && item.skills.length ? (
                    item.skills.map((skill) => (
                      <span key={String(skill)}>
                        <UiIcon name="tick" />
                        {String(skill)}
                      </span>
                    ))
                  ) : (
                    <small className="person-missing">
                      Keahlian belum ditambahkan
                    </small>
                  )}
                </div>
              ) : (
                <div className="customer-chips">
                  <span>{Number(item.orderCount ?? 0)} Pesanan</span>
                  <span>Total {rupiah(Number(item.totalSpent ?? 0))}</span>
                  <span>
                    {item.area
                      ? 'Area: ' + valueText(item.area)
                      : valueText(item.address)}
                  </span>
                </div>
              )}
            </div>
            <div className="figma-person-actions">
              {resource === 'staff' && item.status === 'Bertugas' && (
                <TrackingButton
                  name={String(item.name)}
                  label="Lihat lokasi"
                  className="text-action tracking-location-action"
                />
              )}
              {resource === 'staff' ? (
                edit(item, 'Edit Petugas')
              ) : (
                <a
                  className="button"
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
              <Link
                className={resource === 'staff' ? 'button' : 'button primary'}
                href={config.path + '/' + encodeURIComponent(item.id)}
              >
                {resource === 'staff'
                  ? 'Lihat Detail & Jadwal'
                  : 'Lihat Detail'}
              </Link>
            </div>
          </article>
        ))}
    </>
  );
}
