import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { list, detail } from '@/lib/api';
import { resources, valueText, shiftOf } from '@/lib/resources';
import { normalizeScheduleRows } from '@/lib/schedules';
import { faqTabs } from '@/lib/faq';
import { customerStats } from '@/lib/customers';
import { pageHref, paginate, parsePage } from '@/lib/pagination';
import { Filters } from '@/components/Filters';
import { SearchField } from '@/components/shared/layout';
import {
  ButtonLink,
  EmptyState,
  PageHeader,
  Pagination,
  buttonVariants,
} from '@/components/shared/ui';
import { DialogTrigger } from '@/components/shared/ui/DialogTrigger';
import { ResourceFormServer } from '@/components/ResourceFormServer';
import { Summary } from '@/components/ResourceSummary';
import { OrderList } from '@/components/orders';
import { ServiceList } from '@/components/services';
import { PeopleList } from '@/components/people';
import { FaqList } from '@/components/faq';
import { ScheduleBoard } from '@/components/schedules';
import { TrackingButton } from '@/components/tracking';
import { RecordDetailServer } from '@/components/RecordDetailServer';
import { detailReturn } from '@/lib/detail-return';
import { listCategories } from '@/lib/categories';
import { CategoryManager } from '@/components/categories';
import { PromoManagerServer } from '@/components/PromoManagerServer';
import { UiIcon } from '@/components/shared/ui/UiIcon';
import { displayId } from '@/lib/display';
import { newestOrderFirst } from '@/lib/order-flow';
import { withOrderWorkTimes } from '@/lib/order-work-times';
import type { Resource, RecordData, Search, Order, Service } from '@/types';
import { staffTabs, withOperationalStatus } from '@/lib/staff';
import { validImageUrl } from '@/lib/service-image';
import { serviceMediaUrl } from '@/lib/service-media';
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
    records = withOperationalStatus(records, orders);
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
      const stats = customerStats(orders, customer);
      return {
        ...customer,
        orderCount: stats.orders.length,
        totalSpent: stats.totalSpent,
      };
    });
  }
  if (resource === 'schedules') records = normalizeScheduleRows(records);
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
  const requestedPage = parsePage(query(search, 'page'));
  const {
    page: currentPage,
    pageCount,
    shown,
    from: shownFrom,
    to: shownTo,
  } = paginate(filtered, requestedPage);
  const searchHref = (page: number) => pageHref(config.path, search, page);
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
          : resource === 'schedules'
            ? 'record-detail-dialog'
            : ''
      }
      dialogIcon={resource === 'schedules' ? 'calendar' : 'edit'}
      dialogWidth={
        resource === 'services'
          ? 1000
          : resource === 'schedules'
            ? 660
            : undefined
      }
      className={buttonVariants({ variant: 'accent', className: 'gap-6' })}
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
    <div>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          <div className="flex shrink-0 items-center gap-10 max-sm:w-full max-sm:flex-wrap max-sm:justify-end">
            {resource === 'staff' && <TrackingButton />}
            {(resource === 'orders' || resource === 'schedules') && (
              <Filters date dateCounts={dateCounts} today={today} />
            )}
            {config.canCreate && (
              <DialogTrigger
                label={'Tambah ' + config.singular + ' Baru'}
                title={'Tambah ' + config.singular + ' Baru'}
                className={buttonVariants({
                  variant: 'primary',
                  className: 'shrink-0 gap-8 max-sm:flex-1',
                })}
                icon="plus"
                wide
                dialogClass={
                  resource === 'schedules' ? 'record-detail-dialog' : ''
                }
                dialogWidth={
                  resource === 'services'
                    ? 1000
                    : resource === 'schedules'
                      ? 660
                      : undefined
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
        }
      />
      {query(search, 'saved') && (
        <p
          role="status"
          className="rounded-control border border-success-soft bg-success-soft p-10 text-sm text-success"
        >
          Data berhasil disimpan.
        </p>
      )}
      {query(search, 'taskDispatch') && (
        <p
          role="status"
          className="mx-0 mt-0 mb-16 rounded-md border border-line bg-accent-soft px-14 py-12 text-sm leading-[1.6] text-ink-muted"
        >
          {query(search, 'taskDispatch') === 'simulation'
            ? 'Penugasan tersimpan.'
            : query(search, 'taskDispatch') === 'requested'
              ? 'Penugasan tersimpan. Periksa hasil pengiriman di Pantau Petugas.'
              : 'Penugasan tersimpan. Pengiriman link belum berhasil; buka Pantau Petugas untuk kirim ulang atau salin link.'}
        </p>
      )}
      {resource === 'services' && query(search, 'bannerSaved') && (
        <p
          role="status"
          className="rounded-control border border-success-soft bg-success-soft p-10 text-sm text-success"
        >
          Banner promo berhasil ditambahkan.
        </p>
      )}
      {query(search, 'deleted') && (
        <p
          role="status"
          className="rounded-control border border-success-soft bg-success-soft p-10 text-sm text-success"
        >
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
          resource === 'faqs'
            ? 'mt-20 mb-15 flex flex-wrap items-center justify-between gap-12'
            : 'mt-20 mb-15'
        }
      >
        <Filters
          tabIcons={
            resource === 'services'
              ? Object.fromEntries(
                  categories.flatMap((category) =>
                    validImageUrl(category.icon)
                      ? [
                          [
                            category.name,
                            serviceMediaUrl(
                              category.icon,
                              process.env.API_URL
                                ? new URL(process.env.API_URL).origin
                                : '',
                            ),
                          ],
                        ]
                      : [],
                  ),
                )
              : undefined
          }
          tabs={
            resource === 'services'
              ? [
                  'Semua Layanan',
                  ...new Set([
                    ...categories.map((category) => category.name),
                    ...records.map((record) => String(record.category)),
                  ]),
                ]
              : resource === 'faqs'
                ? faqTabs(categories, records)
                : resource === 'staff'
                  ? staffTabs(records, config.tabs, tab)
                  : config.tabs
          }
        />
        <SearchField mobile={resource !== 'faqs'} faq={resource === 'faqs'} />
      </div>
      {(resource === 'services' || resource === 'faqs') && (
        <CategoryManager
          resource={resource}
          categories={categories.map((category) => ({
            ...category,
            iconSrc: validImageUrl(category.icon)
              ? serviceMediaUrl(
                  category.icon,
                  process.env.API_URL
                    ? new URL(process.env.API_URL).origin
                    : '',
                )
              : null,
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
              ? 'mt-22 flex flex-col gap-12'
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
        <ScheduleBoard
          shown={shown}
          resource={resource}
          tab={tab}
          config={config}
          edit={edit}
        />
        {!shown.length && resource !== 'schedules' && (
          <EmptyState
            title="Belum ada data yang sesuai"
            description={
              config.canCreate
                ? 'Coba ubah pencarian/filter atau tambahkan data pertama.'
                : 'Coba ubah pencarian/filter. Data masuk dari aplikasi pelanggan.'
            }
            action={
              <ButtonLink variant="ghost" href={config.path}>
                Reset filter
              </ButtonLink>
            }
          />
        )}
      </div>
      <Pagination
        page={currentPage}
        pageCount={pageCount}
        from={shownFrom}
        to={shownTo}
        total={filtered.length}
        href={searchHref}
        label={'Halaman ' + config.title}
      />
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
      <PageHeader
        title={'Tambah ' + resources[resource].singular + ' Baru'}
        description="Lengkapi informasi untuk membuat data baru."
        align="start"
      />
      <ResourceFormServer resource={resource} />
    </section>
  );
}
