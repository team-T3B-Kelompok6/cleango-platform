import type { Order } from '@/types';
import { assignmentCandidates } from '@/lib/staff';
import { withOrderWorkTimes } from '@/lib/order-work-times';
import { staffPhotoSource } from '@/lib/staff-photo';
import { getAssignmentLookups } from '../api/ordersApi';
import { assignOrderAction } from '../api/ordersActions';
import { AssignmentForm } from './AssignmentForm';

/** Ambil kandidat petugas untuk pesanan lalu render dialog penugasan. */
export async function AssignmentFormServer({ order }: { order: Order }) {
  const { staff, schedules, orders } = await getAssignmentLookups();
  const { candidates, recommended } = assignmentCandidates({
    staff,
    order,
    schedules,
    orders: await withOrderWorkTimes(orders),
  });
  return (
    <AssignmentForm
      customer={String(order.customer)}
      service={String(order.service)}
      date={String(order.date)}
      time={String(order.time)}
      candidates={candidates.map((person) => ({
        name: person.name,
        photo: staffPhotoSource(person.photoUrl),
        skills: person.skills,
      }))}
      recommended={recommended}
      selected={Array.isArray(order.staff) ? order.staff : []}
      action={assignOrderAction.bind(null, order.id)}
    />
  );
}
