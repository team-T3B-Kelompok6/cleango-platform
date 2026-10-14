import Link from 'next/link';
import type { ReactNode } from 'react';
import type { RecordData, Resource } from '@/types';
import { resources } from '@/lib/resources';
import { DeleteRecordButton } from './DeleteRecordButton';

export function RecordActions({
  resource,
  record,
  edit,
  children,
}: {
  resource: Resource;
  record: RecordData;
  edit: (record: RecordData, label?: string) => ReactNode;
  children?: ReactNode;
}) {
  const config = resources[resource];
  return (
    <div className="figma-row-actions record-rud">
      {children}
      {edit(record, 'Ubah')}
      <Link
        className="button"
        aria-label={'Detail ' + config.singular + ' ' + record.id}
        href={config.path + '/' + encodeURIComponent(record.id)}
      >
        Detail
      </Link>
      <DeleteRecordButton resource={resource} record={record} />
    </div>
  );
}
