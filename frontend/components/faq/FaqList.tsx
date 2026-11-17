import type { RecordListProps } from '@/components/RecordListProps';
import { FaqRow } from './FaqRow';

/** Daftar FAQ; resource lain tidak dirender di sini. */
export function FaqList({ shown, resource, edit }: RecordListProps) {
  if (resource !== 'faqs') return null;
  return (
    <>
      {shown.map((item) => (
        <FaqRow key={item.id} item={item} edit={edit} />
      ))}
    </>
  );
}
