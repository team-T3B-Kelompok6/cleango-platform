import { displayId } from '@/lib/display';
import { ApiError, list } from '@/lib/api';
import { resources } from '@/lib/resources';
import { saveAction } from '@/app/actions';
import { ResourceForm } from './Form';
import type {
  Resource,
  RecordData,
  Staff,
  Order,
  Schedule,
  Service,
  Customer,
} from '@/types';
import { Badge } from './StatusBadge';
import { listCategories } from '@/lib/categories';
import { ServiceForm } from './ServiceForm';
import { OrderEditor, ScheduleEditor } from './BookingEditors';
import { isDemoId } from '@/lib/cleaner/demo-store';
import { withOrderWorkTimes } from '@/lib/order-work-times';
async function optionalLookup<T extends RecordData>(
  resource: Resource,
): Promise<T[]> {
  try {
    return await list<T>(resource);
  } catch (error) {
    if (error instanceof ApiError) return [];
    throw error;
  }
}
async function fieldsFor(resource: Resource, record?: RecordData) {
  const fields = resources[resource].fields;
  if (resource === 'services' || resource === 'faqs') {
    const categories = await listCategories(resource);
    const existing = categories.length ? [] : await list(resource);
    const names = [
      ...new Set([
        ...categories.map((category) => category.name),
        ...existing.map((item) => String(item.category)),
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
  focusPromo = false,
}: {
  resource: Resource;
  record?: RecordData;
  focusPromo?: boolean;
}) {
  if (resource === 'orders' && record) {
    const [staff, services, customers, schedules, orders] = await Promise.all([
      list<Staff>('staff'),
      optionalLookup<Service>('services'),
      optionalLookup<Customer>('customers'),
      list<Schedule>('schedules'),
      list<Order>('orders'),
    ]);
    const customer = customers.find((customer) =>
      record.customerId
        ? customer.id === record.customerId
        : customer.name === record.customer,
    );
    return (
      <OrderEditor
        order={record as Order}
        staff={staff.filter(
          (person) => isDemoId(person.id) === isDemoId(record.id),
        )}
        services={services}
        schedules={schedules}
        orders={await withOrderWorkTimes(orders)}
        phone={String(customer?.phone ?? record.phone ?? '')}
        action={saveAction.bind(null, resource, record.id)}
      />
    );
  }
  if (resource === 'schedules') {
    const staff = await list<Staff>('staff');
    return (
      <ScheduleEditor
        schedule={record as Schedule | undefined}
        staff={staff}
        action={saveAction.bind(null, resource, record?.id ?? null)}
      />
    );
  }
  const fields = await fieldsFor(resource, record);
  if (resource === 'services') {
    return (
      <ServiceForm
        focusPromo={focusPromo}
        initial={record}
        categories={
          fields.find((field) => field.name === 'category')?.options ?? []
        }
        action={saveAction.bind(null, resource, record?.id ?? null)}
      />
    );
  }
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
              <small>Pelanggan · #{displayId(record.id)}</small>
              <strong>{String(record.customer)}</strong>
            </div>
            <Badge status={String(record.status)} />
          </div>
        ) : undefined
      }
    />
  );
}
