import type { RecordListProps } from '@/components/RecordListProps';
import { ServiceCard } from './ServiceCard';

/** Daftar layanan; resource lain tidak dirender di sini. */
export function ServiceList({ shown, resource, edit }: RecordListProps) {
  if (resource !== 'services') return null;
  return (
    <>
      {shown.map((item) => (
        <ServiceCard key={item.id} service={item} edit={edit} />
      ))}
    </>
  );
}
