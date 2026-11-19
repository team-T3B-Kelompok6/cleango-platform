import type { RecordListProps } from '@/components/RecordListProps';
import { StaffRow } from './StaffRow';

/** Daftar petugas; resource lain tidak dirender di sini. */
export function StaffList({ shown, resource, edit }: RecordListProps) {
  if (resource !== 'staff') return null;
  return (
    <>
      {shown.map((item) => (
        <StaffRow key={item.id} item={item} edit={edit} />
      ))}
    </>
  );
}
