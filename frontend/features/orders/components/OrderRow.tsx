import type { ReactNode } from 'react';
import Link from 'next/link';
import { rupiah } from '@/lib/resources';
import { displayId } from '@/lib/display';
import { orderTimeText, needsAssignment } from '@/lib/order-flow';
import { staffPhotoSource } from '@/lib/staff-photo';
import { isDemoId } from '@/lib/cleaner/demo-store';
import type { Order, RecordData, Staff } from '@/types';
import { StatusBadge } from '@/components/ui';
import { UiIcon } from '@/components/ui/UiIcon';
import { StaffAvatar } from '@/components/ui/StaffAvatar';
import { cn } from '@/lib/cn';
import { OrderActions } from './OrderActions';
import { ORDER_COPY } from '../data/orderConstants';

export function OrderRow({
  order,
  staff,
  path,
  edit,
}: {
  order: Order;
  staff: Staff[];
  path: string;
  edit: (record: RecordData, label?: string) => ReactNode;
}) {
  return (
    <article
      className={cn(
        'flex min-h-[185px] flex-col rounded-card border border-line bg-surface px-18 py-16',
        'transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-[2px] hover:border-line-strong hover:shadow-card',
        needsAssignment(order) &&
          'border-warning-line bg-warning-surface hover:border-warning-line',
      )}
    >
      <div className="flex flex-wrap items-center gap-8">
        <Link
          className="text-base font-bold text-ink hover:underline"
          href={path + '/' + encodeURIComponent(order.id)}
          scroll={false}
        >
          #{displayId(order.id)}
        </Link>
        <StatusBadge status={order.status} />
        <span className="ml-auto inline-flex items-center gap-3 text-xs text-ink-meta">
          <UiIcon name="clock" className="size-[9px]" />
          {orderTimeText(order)}
        </span>
      </div>
      <h3 className="mt-10 mb-9 font-display text-md leading-[16px] font-bold text-ink">
        {order.customer}
      </h3>
      <div className="grid grid-cols-2 divide-x divide-line-faint rounded-[7px] border border-line-faint px-9 py-8 text-base text-ink-meta max-sm:grid-cols-1 max-sm:divide-x-0 max-sm:divide-y max-sm:gap-8">
        <span className="flex min-w-0 items-start gap-6 pr-10 max-sm:pr-0">
          <UiIcon name="pin" className="mt-2 size-[13px] shrink-0" />
          {order.address}
        </span>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-8 pl-10 max-sm:pl-0">
          <span className="min-w-0">{order.service}</span>
          <strong className="text-base font-bold whitespace-nowrap text-success">
            {rupiah(order.price)}
          </strong>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-12 pt-13">
        <p className="text-base text-ink-muted">
          {ORDER_COPY.staffPrefix}{' '}
          {order.staff.length ? (
            order.staff.map((name) => (
              <span key={name} className="inline-flex items-center gap-6">
                <StaffAvatar
                  name={name}
                  src={staffPhotoSource(
                    staff.find(
                      (person) =>
                        person.name === name &&
                        isDemoId(person.id) === isDemoId(order.id),
                    )?.photoUrl,
                  )}
                  size="sm"
                />
                <span className="font-semibold">{name}</span>
              </span>
            ))
          ) : (
            <span>{ORDER_COPY.unassigned}</span>
          )}
        </p>
        <OrderActions order={order} edit={edit} />
      </div>
    </article>
  );
}
