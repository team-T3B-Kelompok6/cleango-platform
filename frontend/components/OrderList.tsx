import Link from 'next/link';
import { rupiah } from '@/lib/resources';

import { UiIcon } from './UiIcon';
import { DialogTrigger } from './DialogTrigger';

import { AssignmentFormServer } from './AssignmentFormServer';
import { Badge } from './StatusBadge';
import { TrackingButton } from './tracking/TrackingButton';
import type { Order } from '@/types';
import type { RecordListProps } from './RecordListProps';
export function OrderList({ shown, resource, config, edit }: RecordListProps) {
  return (
    <>
      {resource === 'orders' &&
        shown.map((item) => {
          const order = item as Order;
          return (
            <article
              key={order.id}
              className={
                'order-card ' +
                (['Menunggu Assign', 'Menunggu Lokasi'].includes(order.status)
                  ? 'needs-action'
                  : '')
              }
            >
              <div className="order-card-top">
                <Link
                  className="order-id"
                  href={config.path + '/' + encodeURIComponent(order.id)}
                >
                  #{order.id}
                </Link>
                <Badge status={order.status} />
                <span className="order-time">
                  <UiIcon name="clock" />
                  {order.time}
                </span>
                <button
                  className="order-more"
                  popoverTarget={'order-menu-' + encodeURIComponent(order.id)}
                  aria-label={'Opsi pesanan ' + order.id}
                >
                  <UiIcon name="more" />
                </button>
                <div
                  id={'order-menu-' + encodeURIComponent(order.id)}
                  className="order-more-menu"
                  popover="auto"
                >
                  <Link
                    className="button"
                    href={config.path + '/' + encodeURIComponent(order.id)}
                  >
                    Buka halaman detail #{order.id}
                  </Link>
                </div>
              </div>
              <h3>{order.customer}</h3>
              <div className="order-info">
                <span className="order-address">
                  <UiIcon name="pin" />
                  {order.address}
                </span>
                <span>{order.service}</span>
                <strong>{rupiah(order.price)}</strong>
              </div>
              <div className="order-card-bottom">
                <p>
                  Petugas:{' '}
                  <span>{order.staff.join(' & ') || 'Belum Ditugaskan'}</span>
                </p>
                <div className="order-actions">
                  {order.staff.length > 0 &&
                    order.status === 'Sedang Dikerjakan' && (
                      <TrackingButton
                        name={order.staff[0]}
                        label="Pantau Petugas"
                      />
                    )}
                  {order.status === 'Menunggu Assign' && (
                    <DialogTrigger
                      label="Tugaskan Petugas"
                      title="Tugaskan Petugas"
                      subtitle={'#' + order.id}
                      className="button primary assign-button"
                      dialogClass="order-form-dialog"
                      icon="person"
                    >
                      <AssignmentFormServer order={order} />
                    </DialogTrigger>
                  )}
                  {edit(order)}
                </div>
              </div>
            </article>
          );
        })}
    </>
  );
}
