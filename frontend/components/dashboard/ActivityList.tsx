import type { ReactNode } from 'react';
import type { Order } from '@/types';
import { EmptyState } from '@/components/shared/ui';
import { ActivityRow } from './ActivityRow';
import { DASHBOARD_COPY } from './data';

export function ActivityList({
  orders,
  emptyAction,
}: {
  orders: Order[];
  emptyAction: ReactNode;
}) {
  if (!orders.length) {
    return (
      <EmptyState
        title={DASHBOARD_COPY.activity.emptyTitle}
        description={DASHBOARD_COPY.activity.emptyBody}
        action={emptyAction}
      />
    );
  }
  return (
    <div className="flex flex-col gap-12">
      {orders.map((order) => (
        <ActivityRow key={order.id} order={order} />
      ))}
    </div>
  );
}
