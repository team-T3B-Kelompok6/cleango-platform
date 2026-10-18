import { displayId } from '@/lib/display';
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
  const name =
    resource === 'schedules'
      ? [record.staff, record.date, record.time]
          .map(valueText)
          .filter(Boolean)
          .join(' · ')
      : valueText(record.name ?? record.customer ?? record.question);
  return (
    <DialogTrigger
      label={label}
      title={label}
      subtitle={'#' + displayId(record.id)}
      icon="trash"
      dialogClass="confirmation-dialog"
      className={compact ? 'icon-action record-delete' : 'button record-delete'}
    >
      <DeleteForm
        name={name || '#' + displayId(record.id)}
        action={deleteAction.bind(null, resource, record.id)}
      />
    </DialogTrigger>
  );
}
