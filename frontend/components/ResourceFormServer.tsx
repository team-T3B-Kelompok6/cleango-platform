import { list } from '@/lib/api';
import { resources } from '@/lib/resources';
import { saveAction } from '@/app/actions';
import { ResourceForm } from './Form';
import type { Resource, RecordData, Staff } from '@/types';
async function fieldsFor(resource: Resource) {
  const fields = resources[resource].fields;
  if (resource !== 'orders') return fields;
  const staff = await list<Staff>('staff');
  return fields.map((field) =>
    field.name === 'staff'
      ? {
          ...field,
          options: staff
            .filter((person) => person.status !== 'Nonaktif')
            .map((person) => person.name),
        }
      : field,
  );
}
export async function ResourceFormServer({
  resource,
  record,
}: {
  resource: Resource;
  record?: RecordData;
}) {
  const fields = await fieldsFor(resource);
  return (
    <ResourceForm
      fields={fields}
      initial={record}
      action={saveAction.bind(null, resource, record?.id ?? null)}
      cancelHref={resources[resource].path}
    />
  );
}
