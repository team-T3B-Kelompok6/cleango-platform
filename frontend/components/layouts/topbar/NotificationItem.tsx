'use client';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { displayId } from '@/lib/display';
import { orderStatusLabel } from '@/lib/order-flow';
import type { Order } from '@/types';
import { SHELL_COPY } from '../data';

export function NotificationItem({
  order,
  unread,
  onOpen,
}: {
  order: Order;
  unread: boolean;
  onOpen: (order: Order) => void;
}) {
  return (
    <Link
      href={'/pesanan/' + encodeURIComponent(order.id)}
      className={'notification-row ' + (unread ? 'unread' : '')}
      onClick={() => onOpen(order)}
    >
      {unread && <i className="notification-unread" />}
      <span
        className={
          'notification-symbol ' +
          (order.status === 'Menunggu Assign' ? 'attention' : '')
        }
      >
        <Icon name={order.status === 'Selesai' ? 'check' : 'package'} />
      </span>
      <span className="notification-copy">
        <span className="notification-row-title">
          {orderStatusLabel(order.status)}
          <small>{order.date}</small>
        </span>
        <span>
          {order.customer} · {order.service}
        </span>
        <em>
          {SHELL_COPY.notifications.viewOrder} #{displayId(order.id)}
        </em>
      </span>
    </Link>
  );
}
