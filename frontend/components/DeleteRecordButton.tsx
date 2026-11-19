import { displayId } from '@/lib/display';
import { deleteAction } from '@/app/actions';
import { resources, valueText } from '@/lib/resources';
import type { RecordData, Resource } from '@/types';
import { ConfirmDialog } from '@/components/ui';

/** Tombol hapus baris daftar: dialog konfirmasi + server action. */
export function DeleteRecordButton({
  resource,
  record,
}: {
  resource: Resource;
  record: RecordData;
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
    <ConfirmDialog
      label={label}
      title={label}
      subtitle={'#' + displayId(record.id)}
      message={
        <>
          Hapus <strong>{name || '#' + displayId(record.id)}</strong> dari
          daftar?
        </>
      }
      action={deleteAction.bind(null, resource, record.id)}
    />
  );
}
