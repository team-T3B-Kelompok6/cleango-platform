import type { Order, Staff } from '@/types';
import { newestOrderFirst } from './order-flow';

export function activeOrderForStaff(person: Staff, orders: Order[]) {
  return orders
    .filter((order) => {
      if (
        !order.staff.includes(person.name) ||
        ['Selesai', 'Batal'].includes(order.status)
      )
        return false;
      const stage = order.staffProgress?.find(
        (item) => item.staffName === person.name,
      )?.stage;
      return stage
        ? ['en_route', 'working'].includes(stage)
        : ['Menuju Lokasi', 'Sedang Dikerjakan'].includes(order.status);
    })
    .sort(newestOrderFirst)[0];
}

export function staffOperationalStatus(person: Staff, orders: Order[]) {
  const active = activeOrderForStaff(person, orders);
  if (active) {
    const stage = active.staffProgress?.find(
      (item) => item.staffName === person.name,
    )?.stage;
    return stage === 'en_route' || active.status === 'Menuju Lokasi'
      ? 'Menuju Lokasi'
      : 'Sedang Bekerja';
  }
  if (['Masa Training', 'Nonaktif'].includes(person.status))
    return person.status;
  if (
    orders.some(
      (order) =>
        order.staff.includes(person.name) &&
        !['Selesai', 'Batal'].includes(order.status) &&
        (order.staffProgress?.find((item) => item.staffName === person.name)
          ?.stage === 'assigned' ||
          order.status === 'Menunggu Lokasi'),
    )
  )
    return 'Siap Berangkat';
  return person.status === 'Bertugas' ? 'Bertugas' : 'Siaga & Tersedia';
}

export function recommendedSkills(person: Staff, order: Order): string[] {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  const service = normalize(order.service);
  const groups = [
    'deep cleaning',
    'sofa',
    'kasur',
    'kantor',
    'office',
    'ac',
    'harian',
    'sanitasi',
  ];
  return (Array.isArray(person.skills) ? person.skills : []).filter((skill) => {
    const text = normalize(skill);
    return (
      !!text &&
      ((' ' + service + ' ').includes(' ' + text + ' ') ||
        groups.some(
          (group) =>
            (' ' + service + ' ').includes(' ' + group + ' ') &&
            (' ' + text + ' ').includes(' ' + group + ' '),
        ))
    );
  });
}
