import type { RecordListProps } from '@/components/RecordListProps';
import { CustomerRow } from './CustomerRow';

/** Daftar customer; resource lain tidak dirender di sini. */
export function CustomerList({ shown, resource, edit }: RecordListProps) {
  if (resource !== 'customers') return null;
  return (
    <>
      {shown.map((item) => (
        <CustomerRow key={item.id} item={item} edit={edit} />
      ))}
    </>
  );
}
