import { ApiError, list } from '@/lib/api';
import { saveAction } from '@/app/actions';
import type {
  Resource,
  RecordData,
  Staff,
  Order,
  Schedule,
  Service,
  Customer,
} from '@/types';
import { listCategories } from '@/features/categories';
import { ServiceForm } from '@/features/services';
import { FaqForm } from '@/features/faqs';
import { CustomerForm } from '@/features/customers';
import { StaffForm } from '@/features/staff';
import { OrderEditor } from '@/components/booking/editors';
import { ScheduleEditor } from '@/features/schedules';
import { withOrderWorkTimes } from '@/lib/order-work-times';
import { serviceMediaUrl } from '@/lib/service-media';
import { staffPhotoSource } from '@/lib/staff-photo';
import { staffFormOptions } from '@/lib/staff';
import { isDemoId } from '@/lib/cleaner/demo-store';

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

/** Pilihan kategori untuk layanan/FAQ: gabungan tabel kategori dan data lama. */
async function categoryNames(
  resource: 'services' | 'faqs',
  record?: RecordData,
) {
  const categories = await listCategories(resource);
  const existing = categories.length ? [] : await list(resource);
  return [
    ...new Set([
      ...categories.map((category) => category.name),
      ...existing.map((item) => String(item.category)),
      ...(record?.category ? [String(record.category)] : []),
    ]),
  ];
}

async function OrdersForm({ record }: { record: RecordData }) {
  const [staff, services, customers, schedules, orders] = await Promise.all([
    list<Staff>('staff'),
    optionalLookup<Service>('services'),
    optionalLookup<Customer>('customers'),
    list<Schedule>('schedules'),
    list<Order>('orders'),
  ]);
  const customer = customers.find((item) =>
    record.customerId
      ? item.id === record.customerId
      : item.name === record.customer,
  );
  return (
    <OrderEditor
      order={record as Order}
      staff={staff
        .filter((person) => isDemoId(person.id) === isDemoId(String(record.id)))
        .map((person) => ({
          ...person,
          photoUrl: staffPhotoSource(person.photoUrl),
        }))}
      services={services}
      schedules={schedules}
      orders={await withOrderWorkTimes(orders)}
      phone={String(customer?.phone ?? record.phone ?? '')}
      action={saveAction.bind(null, 'orders', record.id)}
    />
  );
}

async function SchedulesForm({ record }: { record?: RecordData }) {
  const staff = await list<Staff>('staff');
  return (
    <ScheduleEditor
      schedule={record as Schedule | undefined}
      staff={staff.map((person) => ({
        ...person,
        photoUrl: staffPhotoSource(person.photoUrl),
      }))}
      action={saveAction.bind(null, 'schedules', record?.id ?? null)}
    />
  );
}

/** Data yang dibutuhkan form petugas. */
async function staffFormData(record?: RecordData) {
  const [staff, services] = await Promise.all([
    list<Staff>('staff'),
    list<Service>('services'),
  ]);
  const { skillOptions, previousSkills, mentors } = staffFormOptions({
    staff,
    services,
    record,
  });
  return {
    initial: record,
    skillOptions,
    previousSkills,
    mentors,
    photoUrl: staffPhotoSource(record?.photoUrl),
    action: saveAction.bind(null, 'staff', record?.id ?? null),
  };
}

/** Render form/gambar untuk satu resource; data server diambil di sini. */
export async function ResourceFormServer({
  resource,
  record,
  focusPromo = false,
}: {
  resource: Resource;
  record?: RecordData;
  focusPromo?: boolean;
}) {
  switch (resource) {
    case 'orders':
      if (!record)
        throw new Error('Pesanan baru dibuat dari halaman pesanan masuk.');
      return <OrdersForm record={record} />;
    case 'schedules':
      return <SchedulesForm record={record} />;
    case 'staff':
      return <StaffForm {...await staffFormData(record)} />;
    case 'services': {
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
          categories={await categoryNames('services', record)}
          action={saveAction.bind(null, 'services', record?.id ?? null)}
        />
      );
    }
    case 'customers':
      return (
        <CustomerForm
          initial={record}
          action={saveAction.bind(null, 'customers', record?.id ?? null)}
        />
      );
    case 'faqs':
      return (
        <FaqForm
          initial={record}
          categories={await categoryNames('faqs', record)}
          action={saveAction.bind(null, 'faqs', record?.id ?? null)}
        />
      );
  }
}
