import { displayId } from '@/lib/display';
import Link from 'next/link';
import { rupiah } from '@/lib/resources';

import { UiIcon } from './UiIcon';
import { DialogTrigger } from './DialogTrigger';

import { AssignmentFormServer } from './AssignmentFormServer';
import { Badge } from './StatusBadge';
import { TrackingButton } from './tracking/TrackingButton';
import { RecordActions } from './RecordActions';
import type { Order, Staff } from '@/types';
import { ApiError, list } from '@/lib/api';
import { staffPhotoSource } from '@/lib/staff-photo';
import { StaffAvatar } from './StaffAvatar';
import { isDemoId } from '@/lib/cleaner/demo-store';
import type { RecordListProps } from './RecordListProps';
import { needsAssignment, orderTimeText } from '@/lib/order-flow';
export async function OrderList({
  shown,
  resource,
  config,
  edit,
}: RecordListProps) {
  let staff: Staff[] = [];
  if (resource === 'orders') {
    try {
      staff = await list<Staff>('staff');
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
    }
  }
  return (
    <>
      {resource === 'orders' &&
        shown.map((item) => {
          const order = item as Order;
          return (
            <article
              key={order.id}
              className={
                'order-card ' + (needsAssignment(order) ? 'needs-action' : '')
              }
            >
              <div className="order-card-top">
                <Link
                  className="order-id"
                  href={config.path + '/' + encodeURIComponent(order.id)}
                  scroll={false}
                >
                  #{displayId(order.id)}
                </Link>
                <Badge status={order.status} />
                <span className="order-time">
                  <UiIcon name="clock" />
                  {orderTimeText(order)}
                </span>
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
                <p className="order-assigned-staff">
                  Petugas:{' '}
                  {order.staff.length ? (
                    order.staff.map((name) => (
                      <span key={name} className="assigned-staff-person">
                        <StaffAvatar
                          name={name}
                          src={staffPhotoSource(
                            staff.find(
                              (person) =>
                                person.name === name &&
                                isDemoId(person.id) === isDemoId(order.id),
                            )?.photoUrl,
                          )}
                          className="staff-photo-small"
                        />
                        <span>{name}</span>
                      </span>
                    ))
                  ) : (
                    <span>Belum Ditugaskan</span>
                  )}
                </p>
                <RecordActions resource={resource} record={order} edit={edit}>
                  {order.staff.length > 0 && order.status !== 'Batal' && (
                    <TrackingButton
                      name={order.staff[0]}
                      orderId={order.id}
                      label="Pantau Petugas"
                    />
                  )}
                  {needsAssignment(order) && (
                    <DialogTrigger
                      label="Tugaskan Petugas"
                      title="Tugaskan Petugas"
                      subtitle={'#' + displayId(order.id)}
                      className="button primary assign-button"
                      dialogClass="order-form-dialog"
                      icon="person"
                    >
                      <AssignmentFormServer order={order} />
                    </DialogTrigger>
                  )}
                </RecordActions>
              </div>
            </article>
          );
        })}
    </>
  );
}
