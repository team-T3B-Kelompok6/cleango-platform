import type { Order, Staff } from '@/types';
import type { RecordListProps } from '@/components/RecordListProps';
import { ApiError, list } from '@/lib/api';
import { OrderRow } from './OrderRow';

export async function OrderList({
  shown,
  resource,
  config,
  edit,
}: RecordListProps) {
  if (resource !== 'orders') return null;

  let staff: Staff[] = [];
  try {
    staff = await list<Staff>('staff');
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
  }

  return (
    <>
      {(shown as Order[]).map((order) => (
        <OrderRow
          key={order.id}
          order={order}
          staff={staff}
          path={config.path}
          edit={edit}
        />
      ))}
    </>
  );
}
