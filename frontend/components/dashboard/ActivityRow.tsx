import Link from 'next/link';
import { displayId } from '@/lib/display';
import { orderTimeText } from '@/lib/order-flow';
import type { Order } from '@/types';
import { Icon, StatusBadge } from '@/components/shared/ui';
import { DASHBOARD_COPY } from './data';

export function ActivityRow({ order }: { order: Order }) {
  const staff =
    order.staff.join(' & ') || DASHBOARD_COPY.activity.unassignedStaff;
  return (
    <Link
      href={'/pesanan/' + encodeURIComponent(order.id)}
      className="flex min-h-[90px] flex-wrap items-center gap-14 rounded-card border border-line bg-surface px-15 py-13 transition-colors hover:border-line-strong hover:shadow-card sm:flex-nowrap"
    >
      <span className="grid size-40 shrink-0 place-items-center rounded-md bg-surface-tint text-accent">
        <Icon
          name={
            order.service.toLowerCase().includes('kantor')
              ? 'working'
              : 'services'
          }
        />
      </span>
      <div className="min-w-0 flex-1">
        <small className="block text-base leading-[1.5] text-ink-muted">
          #{displayId(order.id)} · {order.address}
        </small>
        <h3 className="font-display text-md leading-[1.3] font-bold text-ink">
          {order.service}
        </h3>
        <p className="mt-3 flex flex-wrap items-center gap-x-12 gap-y-4 text-base leading-[1.6] text-ink-muted">
          <span>Petugas: {staff}</span>
          <span className="inline-flex items-center gap-4">
            <Icon name="clock" className="size-[10px]" />
            {orderTimeText(order)}
          </span>
        </p>
      </div>
      <StatusBadge status={order.status} />
      <Icon name="chevron" className="ml-auto" />
    </Link>
  );
}
