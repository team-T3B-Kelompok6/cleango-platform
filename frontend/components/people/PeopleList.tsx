import type { RecordListProps } from '@/components/RecordListProps';
import { CustomerRow } from './CustomerRow';
import { StaffRow } from './StaffRow';

/** Daftar petugas atau customer; resource lain tidak dirender di sini. */
export function PeopleList({ shown, resource, edit }: RecordListProps) {
  if (resource !== 'staff' && resource !== 'customers') return null;
  return (
    <>
      {shown.map((item) =>
        resource === 'staff' ? (
          <StaffRow key={item.id} item={item} edit={edit} />
        ) : (
          <CustomerRow key={item.id} item={item} edit={edit} />
        ),
      )}
    </>
  );
}
