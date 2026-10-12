import { list } from '@/lib/api';

import { assignAction } from '@/app/actions';
import { ResourceForm } from './Form';
import type { Staff, Order } from '@/types';
export async function AssignmentFormServer({ order }: { order: Order }) {
  const staff = await list<Staff>('staff');
  return (
    <>
      <div className="assignment-summary">
        <strong>{order.customer}</strong>
        <p>
          {order.service} · {order.time}
        </p>
      </div>
      <ResourceForm
        fields={[
          {
            name: 'staff',
            label: 'Petugas tersedia',
            kind: 'multiselect',
            options: staff
              .filter((person) => person.status === 'Tersedia')
              .map((person) => person.name),
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
