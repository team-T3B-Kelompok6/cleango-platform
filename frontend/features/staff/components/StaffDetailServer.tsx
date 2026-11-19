import { ApiError, list } from '@/lib/api';
import type { Order, Schedule, Staff } from '@/types';
import { withOrderWorkTimes } from '@/lib/order-work-times';
import { staffDetailView, staffSkills } from '@/lib/staff';
import { ResourceFormServer } from '@/components/ResourceFormServer';
import { StaffDetail } from './StaffDetail';
import { StaffDetailModal } from './StaffDetailModal';

async function related<T extends Order | Schedule>(
  resource: 'orders' | 'schedules',
) {
  try {
    return await list<T>(resource);
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
}

/** Ambil data penugasan petugas lalu render dialog detail. */
export async function StaffDetailServer({
  staff,
  closeHref = '/petugas',
}: {
  staff: Staff;
  closeHref?: string;
}) {
  const [rawOrders, schedules] = await Promise.all([
    related<Order>('orders'),
    related<Schedule>('schedules'),
  ]);
  const view = staffDetailView({
    staff,
    orders: rawOrders ? await withOrderWorkTimes(rawOrders) : null,
    schedules,
  });
  return (
    <StaffDetailModal
      key={staff.id}
      closeHref={closeHref}
      id={staff.id}
      href={view.href}
      profile={
        <StaffDetail
          staff={staff}
          skills={staffSkills(staff)}
          status={view.status}
          phone={view.phone}
          href={view.href}
          task={view.task}
          scheduleCount={view.scheduleCount}
          dataAvailable={view.dataAvailable}
        />
      }
      editForm={<ResourceFormServer resource="staff" record={staff} />}
    />
  );
}
