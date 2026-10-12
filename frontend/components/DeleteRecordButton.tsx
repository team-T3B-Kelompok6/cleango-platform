import { deleteAction } from '@/app/actions';
import { resources, valueText } from '@/lib/resources';
import type { RecordData, Resource } from '@/types';
import { DialogTrigger } from './DialogTrigger';
import { DeleteForm } from './Form';

export function DeleteRecordButton({
  resource,
  record,
  compact = true,
}: {
  resource: Resource;
  record: RecordData;
  compact?: boolean;
}) {
  const label = 'Hapus ' + resources[resource].singular;
  const name = valueText(record.name ?? record.customer ?? record.question);
  return (
    <DialogTrigger
      label={label}
      title={label}
      subtitle={'#' + record.id}
      icon="trash"
      className={compact ? 'icon-action record-delete' : 'button record-delete'}
    >
      <DeleteForm
        name={name || '#' + record.id}
        action={deleteAction.bind(null, resource, record.id)}
      />
    </DialogTrigger>
  );
}
