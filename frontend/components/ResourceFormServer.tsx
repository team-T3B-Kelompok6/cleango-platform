import { list } from '@/lib/api';
import { resources } from '@/lib/resources';
import { saveAction } from '@/app/actions';
import { ResourceForm } from './Form';
import type { Resource, RecordData, Staff } from '@/types';
import { Badge } from './StatusBadge';
import { listCategories } from '@/lib/categories';
async function fieldsFor(resource: Resource, record?: RecordData) {
  const fields = resources[resource].fields;
  if (resource === 'services' || resource === 'faqs') {
    const categories = await listCategories(resource);
    const names = [
      ...new Set([
        ...categories.map((category) => category.name),
        ...(record?.category ? [String(record.category)] : []),
      ]),
    ];
    return fields.map((field) =>
      field.name === 'category' ? { ...field, options: names } : field,
    );
  }
  if (resource !== 'orders') return fields;
  const staff = await list<Staff>('staff');
  const assigned = Array.isArray(record?.staff) ? record.staff : [];
  return fields.map((field) =>
    field.name === 'staff'
      ? {
          ...field,
          options: staff
            .filter(
              (person) =>
                ['Tersedia', 'Bertugas'].includes(person.status) ||
                assigned.includes(person.name),
            )
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
  const fields = await fieldsFor(resource, record);
  return (
    <ResourceForm
      fields={fields}
      initial={record}
      action={saveAction.bind(null, resource, record?.id ?? null)}
      cancelHref={resources[resource].path}
      submitLabel={
        record
          ? 'Simpan perubahan'
          : 'Simpan ' +
            resources[resource].singular.toLowerCase().replace(/^faq$/, 'FAQ')
      }
      intro={
        resource === 'orders' && record ? (
          <div className="order-edit-summary">
            <div>
              <small>Pelanggan · #{record.id}</small>
              <strong>{String(record.customer)}</strong>
            </div>
            <Badge status={String(record.status)} />
          </div>
        ) : undefined
      }
    />
  );
}
