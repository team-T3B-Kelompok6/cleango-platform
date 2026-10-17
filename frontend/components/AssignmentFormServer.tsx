import { list } from '@/lib/api';

import { assignAction } from '@/app/actions';
import { ResourceForm } from './Form';
import type { Staff, Order, Schedule } from '@/types';
import { assignmentIssue } from '@/lib/staff-schedules';
import { isDemoId } from '@/lib/cleaner/demo-store';
import { recommendedSkills } from '@/lib/staff-availability';
import { withOrderWorkTimes } from '@/lib/order-work-times';
export async function AssignmentFormServer({ order }: { order: Order }) {
  const [staff, schedules, orders] = await Promise.all([
    list<Staff>('staff'),
    list<Schedule>('schedules'),
    list<Order>('orders'),
  ]);
  const candidates = staff.filter(
    (person) => isDemoId(person.id) === isDemoId(order.id),
  );
  const liveOrders = await withOrderWorkTimes(orders);
  const available = candidates
    .filter((person) => !assignmentIssue(person, order, schedules, liveOrders))
    .sort(
      (a, b) =>
        recommendedSkills(b, order).length -
          recommendedSkills(a, order).length || a.name.localeCompare(b.name),
    );
  return (
    <>
      <div className="assignment-summary">
        <strong>{order.customer}</strong>
        <p>
          {order.service} · {order.date} · {order.time}
        </p>
        <p className="muted">
          Pilihan petugas mengikuti tanggal dan jam shift di Kelola Jadwal.
        </p>
        {!available.length && (
          <p role="status">
            Belum ada petugas dengan shift yang sesuai. Tambahkan atau ubah
            jadwal petugas terlebih dahulu.
          </p>
        )}
      </div>
      <ResourceForm
        fields={[
          {
            name: 'staff',
            label: 'Petugas sesuai jadwal',
            kind: 'multiselect',
            options: available.map((person) => person.name),
            recommendedOptions: available
              .filter((person) => recommendedSkills(person, order).length > 0)
              .map((person) => person.name),
            optionHints: Object.fromEntries(
              available.map((person) => [
                person.name,
                Array.isArray(person.skills) && person.skills.length
                  ? 'Keahlian: ' + person.skills.join(' · ')
                  : 'Keahlian belum ditambahkan',
              ]),
            ),
          },
        ]}
        initial={order}
        action={assignAction.bind(null, order.id)}
        cancelHref="/pesanan"
        submitLabel="Tugaskan petugas"
      />
    </>
  );
}
