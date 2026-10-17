import type { ReactNode } from 'react';
import type { RecordData, Resource } from '@/types';
import { RecordDetailLink } from './RecordDetailLink';
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
  return (
    <div className="figma-row-actions record-rud">
      {children}
      {edit(record, 'Ubah')}
      <RecordDetailLink resource={resource} id={record.id} />
      <DeleteRecordButton resource={resource} record={record} />
    </div>
  );
}
