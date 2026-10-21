import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { list, detail } from '@/lib/api';
import { resources, valueText, shiftOf } from '@/lib/resources';
import { Filters, SearchInput } from './Filters';
import { DialogTrigger } from './DialogTrigger';
import { ResourceFormServer } from './ResourceFormServer';
import { Summary } from './ResourceSummary';
import { OrderList } from './OrderList';
import { ServiceList } from './ServiceList';
import { PeopleList } from './PeopleList';
import { FaqList } from './FaqList';
import { ScheduleList } from './ScheduleList';
import { TrackingButton } from './tracking/TrackingButton';
import { RecordDetailServer } from './RecordDetailServer';
import { detailReturn } from '@/lib/detail-return';
import { listCategories } from '@/lib/categories';
import { CategoryManager } from './CategoryManager';
import { PromoManagerServer } from './PromoManagerServer';
import { UiIcon } from './UiIcon';
import { displayId } from '@/lib/display';
import { newestOrderFirst } from '@/lib/order-flow';
import { withOrderWorkTimes } from '@/lib/order-work-times';
import type {
  Resource,
  RecordData,
  Search,
  Order,
  Service,
  Staff,
} from '@/types';
import { staffOperationalStatus } from '@/lib/staff-availability';
function query(search: Search, key: string) {
  const value = search[key];
  return typeof value === 'string' ? value : '';
}

export async function ResourceListPage({
  resource,
  search,
}: {
  resource: Resource;
  search: Search;
}) {
  const config = resources[resource];
  const categories =
    resource === 'services' || resource === 'faqs'
      ? await listCategories(resource)
      : [];
  let records = await list(resource);
  if (resource === 'orders')
    records = [...(await withOrderWorkTimes(records))].sort(newestOrderFirst);
  if (resource === 'staff') {
    const orders = await withOrderWorkTimes(await list<Order>('orders'));
    records = records.map((person) => ({
      ...person,
      operationalStatus: staffOperationalStatus(person as Staff, orders),
    }));
  }
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
  }).format(new Date());
  const dateCounts: Record<string, number> = {};
  if (resource === 'orders' || resource === 'schedules') {
    for (const record of records) {
      const date = String(record.date);
      dateCounts[date] = (dateCounts[date] ?? 0) + 1;
    }
  }
  if (resource === 'customers') {
    const orders = await list<Order>('orders');
    records = records.map((customer) => {
      const ownOrders = orders.filter((order) =>
        order.customerId
          ? order.customerId === customer.id
          : order.customer === customer.name,
      );
      return {
        ...customer,
        orderCount: ownOrders.length,
        totalSpent: ownOrders
          .filter((order) => order.status === 'Selesai')
          .reduce((sum, order) => sum + order.price, 0),
      };
    });
  }
  if (resource === 'schedules') {
    records = records
      .map((record) => ({
        ...record,
        date: String(record.date),
        staff: String(record.staff),
      }))
      .sort(
        (a, b) =>
          String(b.date).localeCompare(String(a.date)) ||
          String(a.staff).localeCompare(String(b.staff)),
      );
  }
  const q = query(search, 'q').toLowerCase(),
    tab = query(search, 'tab'),
    from = query(search, 'from'),
    to = query(search, 'to');
  const filtered = records.filter(
    (item) =>
      (!q ||
        Object.values(item)
          .map(valueText)
          .join(' ')
          .toLowerCase()
          .includes(q)) &&
      (!tab ||
        valueText(
          config.tabField === 'shift'
            ? shiftOf(String(item.time))
            : item[config.tabField ?? ''],
        ) === tab) &&
      (!from || String(item.date) >= from) &&
      (!to || String(item.date) <= to),
  );
  const requestedPage = Number(query(search, 'page'));
  const page =
      Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1,
    pageCount = Math.max(1, Math.ceil(filtered.length / 4)),
    currentPage = Math.min(page, pageCount),
    shown =
      resource === 'faqs'
        ? filtered.slice((currentPage - 1) * 4, currentPage * 4)
        : filtered;
  const searchHref = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(search))
      if (typeof v === 'string' && k !== 'page') params.set(k, v);
    params.set('page', String(p));
    return config.path + '?' + params.toString();
  };
  const edit = (item: RecordData, label = 'Detail & Ubah') => (
    <DialogTrigger
      label={label}
      title={
        resource === 'services'
          ? label.includes('Promo')
            ? 'Atur Promo Layanan'
            : 'Ubah Layanan'
          : resource === 'orders'
            ? 'Ubah Pesanan'
            : resource === 'schedules'
              ? 'Ubah Jadwal'
              : 'Ubah ' + config.singular
      }
      ariaLabel={
        (resource === 'services' && label.includes('Promo') ? label : 'Ubah') +
        ' ' +
        config.singular +
        ' ' +
        item.id
      }
      subtitle={
        '#' +
        displayId(item.id) +
        (resource === 'services'
          ? ' · Kelola foto, tarif, durasi, dan fasilitas layanan.'
          : '')
      }
      wide
      dialogClass={
        resource === 'orders'
          ? 'record-detail-dialog orders-detail-dialog'
          : resource === 'services'
            ? 'service-form-dialog'
            : resource === 'schedules'
              ? 'record-detail-dialog schedules-detail-dialog'
              : ''
      }
      dialogIcon={resource === 'schedules' ? 'calendar' : 'edit'}
      className="button edit-action"
      icon="edit"
    >
      <ResourceFormServer
        resource={resource}
        record={item}
        focusPromo={resource === 'services' && label.includes('Promo')}
      />
    </DialogTrigger>
  );
  return (
    <div
      className={
        'resource-page resource-' +
        resource +
        (resource === 'faqs' ? ' faq-page' : '')
      }
    >
      <div className="page-title admin-heading">
        <div>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        <div className="admin-heading-actions">
          {resource === 'staff' && <TrackingButton />}
          {(resource === 'orders' || resource === 'schedules') && (
            <Filters date dateCounts={dateCounts} today={today} />
          )}
          {config.canCreate && (
            <DialogTrigger
              label={'Tambah ' + config.singular + ' Baru'}
              title={'Tambah ' + config.singular + ' Baru'}
              className="button primary admin-add"
              icon="plus"
              wide
              dialogClass={
                resource === 'services'
                  ? 'service-form-dialog'
                  : resource === 'schedules'
                    ? 'record-detail-dialog schedules-detail-dialog'
                    : ''
              }
              subtitle={
                resource === 'services'
                  ? 'Atur detail paket, harga, dan fasilitas layanan.'
                  : undefined
              }
            >
              <ResourceFormServer resource={resource} />
            </DialogTrigger>
          )}
        </div>
      </div>
      {query(search, 'saved') && (
        <p className="form-success" role="status">
          Data berhasil disimpan.
        </p>
      )}
      {query(search, 'taskDispatch') && (
        <p className="dispatch-result-note" role="status">
          {query(search, 'taskDispatch') === 'simulation'
            ? 'Penugasan tersimpan.'
            : query(search, 'taskDispatch') === 'requested'
              ? 'Penugasan tersimpan. Periksa hasil pengiriman di Pantau Petugas.'
              : 'Penugasan tersimpan. Pengiriman link belum berhasil; buka Pantau Petugas untuk kirim ulang atau salin link.'}
        </p>
      )}
      {resource === 'services' && query(search, 'bannerSaved') && (
        <p className="form-success" role="status">
          Banner promo berhasil ditambahkan.
        </p>
      )}
      {query(search, 'deleted') && (
        <p className="form-success" role="status">
          Data berhasil dihapus.
        </p>
      )}
      <Summary
        resource={resource}
        records={records}
        categoryNames={categories.map((category) => category.name)}
      />
      <div
        className={
          resource === 'faqs' ? 'faq-filter-bar' : 'resource-filter-bar'
        }
      >
        <Filters
          tabs={
            resource === 'services' || resource === 'faqs'
              ? [
                  resource === 'services' ? 'Semua Layanan' : 'Semua',
                  ...new Set([
                    ...categories.map((category) => category.name),
                    ...records.map((record) => String(record.category)),
                  ]),
                ]
              : resource === 'staff' &&
                  (records.some((person) => person.status === 'Nonaktif') ||
                    tab === 'Nonaktif')
                ? [...new Set([...(config.tabs ?? []), 'Nonaktif'])]
                : config.tabs
          }
        />
        <SearchInput mobile={resource !== 'faqs'} faq={resource === 'faqs'} />
      </div>
      {(resource === 'services' || resource === 'faqs') && (
        <CategoryManager
          resource={resource}
          categories={categories.map((category) => ({
            ...category,
            serviceCount: records.filter(
              (record) => record.category === category.name,
            ).length,
          }))}
          count={
            new Set([
              ...categories.map((category) => category.name),
              ...records.map((record) => String(record.category)),
            ]).size
          }
        >
          {resource === 'services' && (
            <Suspense
              fallback={
                <button type="button" className="button category-add" disabled>
                  <UiIcon name="tag" /> Kelola Promo
                </button>
              }
            >
              <PromoManagerServer
                services={records as Service[]}
                today={today}
              />
            </Suspense>
          )}
        </CategoryManager>
      )}
      <div
        className={
          resource === 'orders'
            ? 'order-list'
            : resource === 'faqs'
              ? 'faq-design-list'
              : 'figma-list'
        }
        key={[tab, q, from, to, currentPage].join('-')}
      >
        <OrderList
          shown={shown}
          resource={resource}
          tab={tab}
          config={config}
          edit={edit}
        />
        <ServiceList
          shown={shown}
          resource={resource}
          tab={tab}
          config={config}
          edit={edit}
        />
        <PeopleList
          shown={shown}
          resource={resource}
          tab={tab}
          config={config}
          edit={edit}
        />
        <FaqList
          shown={shown}
          resource={resource}
          tab={tab}
          config={config}
          edit={edit}
        />
        <ScheduleList
          shown={shown}
          resource={resource}
          tab={tab}
          config={config}
          edit={edit}
        />
        {!shown.length && resource !== 'schedules' && (
          <div className="empty-state">
            <h3>Belum ada data yang sesuai</h3>
            <p>
              {config.canCreate
                ? 'Coba ubah pencarian/filter atau tambahkan data pertama.'
                : 'Coba ubah pencarian/filter. Data masuk dari aplikasi pelanggan.'}
            </p>
            <Link className="button" href={config.path}>
              Reset filter
            </Link>
          </div>
        )}
      </div>
      {resource === 'faqs' && (
        <div className="faq-pagination">
          <span>
            Menampilkan {shown.length} dari {filtered.length} pertanyaan
          </span>
          <nav aria-label="Pagination FAQ">
            {Array.from({ length: pageCount }, (_, index) => (
              <Link
                key={index}
                href={searchHref(index + 1)}
                className="button"
                aria-current={currentPage === index + 1 ? 'page' : undefined}
              >
                {index + 1}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
export async function ResourceDetailPage({
  resource,
  id,
  saved = false,
  search = {},
}: {
  resource: Resource;
  id: string;
  saved?: boolean;
  search?: Search;
}) {
  const record = await detail(resource, id);
  const returnTo = detailReturn(resource, search);
  return (
    <>
      <ResourceListPage
        resource={resource}
        search={{ ...returnTo.search, ...(saved ? { saved: '1' } : {}) }}
      />
      <RecordDetailServer
        resource={resource}
        record={record}
        closeHref={returnTo.href}
      />
    </>
  );
}
export async function ResourceNewPage({ resource }: { resource: Resource }) {
  if (!resources[resource].canCreate) notFound();
  return (
    <section className="standalone-form">
      <div className="page-title">
        <div>
          <h1>Tambah {resources[resource].singular} Baru</h1>
          <p>Lengkapi informasi untuk membuat data baru.</p>
        </div>
      </div>
      <ResourceFormServer resource={resource} />
    </section>
  );
}
