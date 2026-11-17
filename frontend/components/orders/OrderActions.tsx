import type { ReactNode } from 'react';
import { DialogTrigger } from '@/components/shared/ui/DialogTrigger';
import { buttonVariants } from '@/components/shared/ui';
import { RecordActions } from '@/components/RecordActions';
import { AssignmentFormServer } from '@/components/AssignmentFormServer';
import { TrackingButton } from '@/components/tracking';
import { displayId } from '@/lib/display';
import { needsAssignment } from '@/lib/order-flow';
import type { Order, RecordData, Resource } from '@/types';
import { ORDER_COPY } from './data';

/** Aksi per baris pesanan: pantau, tugaskan, ubah, detail, hapus. */
export function OrderActions({
  order,
  edit,
}: {
  order: Order;
  edit: (record: RecordData, label?: string) => ReactNode;
}) {
  return (
    <RecordActions resource={'orders' as Resource} record={order} edit={edit}>
      {order.staff.length > 0 && order.status !== 'Batal' && (
        <TrackingButton
          name={order.staff[0]}
          orderId={order.id}
          label={ORDER_COPY.monitor}
        />
      )}
      {needsAssignment(order) && (
        <DialogTrigger
          label={ORDER_COPY.assign}
          title={ORDER_COPY.assign}
          subtitle={'#' + displayId(order.id)}
          className={buttonVariants({ variant: 'primary' })}
          dialogClass="order-form-dialog"
          icon="person"
        >
          <AssignmentFormServer order={order} />
        </DialogTrigger>
      )}
    </RecordActions>
  );
}
