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
  Field,
} from '@/types';
import { Badge } from './StatusBadge';
import { listCategories } from '@/lib/categories';
import { ServiceForm } from './ServiceForm';
import { OrderEditor, ScheduleEditor } from './BookingEditors';
import { isDemoId } from '@/lib/cleaner/demo-store';
import { withOrderWorkTimes } from '@/lib/order-work-times';
import { serviceMediaUrl } from '@/lib/service-media';
import { serviceSkillOptions } from '@/lib/staff-skills';
import { staffPhotoSource } from '@/lib/staff-photo';
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
  if (resource === 'staff') {
    const [staff, services] = await Promise.all([
      list<Staff>('staff'),
      list<Service>('services'),
    ]);
    const options = serviceSkillOptions(services);
    const previous = Array.isArray(record?.skills)
      ? record.skills.filter(
          (skill): skill is string =>
            typeof skill === 'string' && !options.includes(skill),
        )
      : [];
    const trainee = record?.status === 'Masa Training';
    const mentors = staff.filter(
      (person) =>
        person.id !== record?.id &&
        ['Tersedia', 'Bertugas'].includes(person.status),
    );
    return fields.flatMap((field): Field[] => {
      if (field.name === 'skills')
        return trainee
          ? []
          : [
              {
                ...field,
                options,
                hint: previous.length
                  ? 'Pilih layanan yang dikuasai. Keahlian sebelumnya: ' +
                    previous.join(', ') +
                    '.'
                  : field.hint,
              },
            ];
      if (field.name === 'status')
        return [
          {
            ...field,
            hint: trainee
              ? 'Saat keluar dari training, pilih keahlian aktual trainee sebelum menyimpan.'
              : field.hint,
          },
          {
            name: 'trainerId',
            label: 'Mentor senior',
            kind: 'select' as const,
            required: false,
            options: ['', ...mentors.map((person) => person.id)],
            optionLabels: {
              '': 'Tanpa mentor',
              ...Object.fromEntries(
                mentors.map((person) => [person.id, person.name]),
              ),
            },
            hint: 'Opsional. Hanya petugas aktif non-training. Keahliannya tampil sebagai materi pendampingan, bukan keahlian trainee.',
          },
        ];
      return [field];
    });
  }
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
        staff={staff
          .filter((person) => isDemoId(person.id) === isDemoId(record.id))
          .map((person) => ({
            ...person,
            photoUrl: staffPhotoSource(person.photoUrl),
          }))}
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
        staff={staff.map((person) => ({
          ...person,
          photoUrl: staffPhotoSource(person.photoUrl),
        }))}
        action={saveAction.bind(null, resource, record?.id ?? null)}
      />
    );
  }
  const fields = await fieldsFor(resource, record);
  if (resource === 'services') {
    const origin = process.env.API_URL
      ? new URL(process.env.API_URL).origin
      : '';
    const initialRecord = record
      ? {
          ...record,
          imageUrl: record.imageUrl
            ? serviceMediaUrl(String(record.imageUrl), origin)
            : record.imageUrl,
        }
      : undefined;
    return (
      <ServiceForm
        focusPromo={focusPromo}
        initial={initialRecord}
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
      staffPhoto={
        resource === 'staff' ? staffPhotoSource(record?.photoUrl) : undefined
      }
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
