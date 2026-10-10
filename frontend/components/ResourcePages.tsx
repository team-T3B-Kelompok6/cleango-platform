import Link from 'next/link';
import { list, detail } from '@/lib/api';
import { resources, rupiah, valueText, shiftOf } from '@/lib/resources';
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
import type { Resource, RecordData, Search, Order } from '@/types';
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
  let records = await list(resource);
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
        orderCount: customer.orderCount ?? ownOrders.length,
        totalSpent:
          customer.totalSpent ??
          ownOrders
            .filter((order) => order.status === 'Selesai')
            .reduce((sum, order) => sum + order.price, 0),
      };
    });
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
  const page = Math.max(1, Number(query(search, 'page')) || 1),
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
      title={'Detail & Ubah ' + config.singular}
      subtitle={'#' + item.id}
      wide={resource === 'orders'}
      dialogClass={resource === 'orders' ? 'order-form-dialog' : ''}
      className={
        resource === 'faqs'
          ? 'icon-action'
          : resource === 'services' || resource === 'staff'
            ? 'text-action edit-action'
            : 'button'
      }
      icon={
        ['services', 'staff', 'faqs'].includes(resource) ? 'edit' : undefined
      }
    >
      <ResourceFormServer resource={resource} record={item} />
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
            <Filters date />
          )}
          <DialogTrigger
            label={'Tambah ' + config.singular + ' Baru'}
            title={'Tambah ' + config.singular + ' Baru'}
            className="button primary admin-add"
            icon={resource === 'schedules' ? undefined : 'plus'}
            wide={resource === 'orders'}
            dialogClass={resource === 'orders' ? 'order-form-dialog' : ''}
          >
            <ResourceFormServer resource={resource} />
          </DialogTrigger>
        </div>
      </div>
      {query(search, 'saved') && (
        <p className="form-success" role="status">
          Data berhasil disimpan.
        </p>
      )}
      {query(search, 'deleted') && (
        <p className="form-success" role="status">
          Data berhasil dihapus.
        </p>
      )}
      <Summary resource={resource} records={records} />
      <div
        className={
          resource === 'faqs' ? 'faq-filter-bar' : 'resource-filter-bar'
        }
      >
        <Filters tabs={config.tabs} />
        <SearchInput mobile={resource !== 'faqs'} faq={resource === 'faqs'} />
      </div>
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
            <p>Coba ubah pencarian/filter atau tambahkan data pertama.</p>
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
}: {
  resource: Resource;
  id: string;
  saved?: boolean;
}) {
  const config = resources[resource],
    record = await detail(resource, id);
  const related =
    resource === 'staff'
      ? (await list('schedules')).filter((item) =>
          String(item.staff).split(' & ').includes(String(record.name)),
        )
      : resource === 'customers'
        ? (await list<Order>('orders')).filter((item) =>
            item.customerId
              ? item.customerId === id
              : item.customer === record.name,
          )
        : [];
  return (
    <div className="record-page">
      <div className="page-title">
        <div>
          <h1>Detail {config.singular}</h1>
          <p>#{record.id}</p>
        </div>
        <div className="admin-heading-actions">
          {resource === 'staff' && (
            <TrackingButton name={String(record.name)} />
          )}
          {resource === 'orders' &&
            Array.isArray(record.staff) &&
            record.staff.length > 0 && (
              <TrackingButton name={String(record.staff[0])} />
            )}
          <Link className="button" href={config.path}>
            Kembali ke daftar
          </Link>
        </div>
      </div>
      {saved && (
        <p role="status" className="form-success">
          Data berhasil disimpan.
        </p>
      )}
      <dl className="record-detail">
        {config.fields.map((field) => (
          <div
            key={field.name}
            className={field.kind === 'textarea' ? 'full-width' : ''}
          >
            <dt>{field.label}</dt>
            <dd>
              {field.name === 'price'
                ? rupiah(Number(record[field.name]))
                : valueText(record[field.name]) || '—'}
            </dd>
          </div>
        ))}
      </dl>
      {(resource === 'staff' || resource === 'customers') && (
        <section className="admin-panel">
          <h2>
            {resource === 'staff' ? 'Jadwal & Penugasan' : 'Riwayat Pesanan'}
          </h2>
          {related.length ? (
            <div className="figma-list">
              {related.map((item) => (
                <article className="finance-order-row" key={item.id}>
                  <div>
                    <small>
                      #{item.id} · {valueText(item.date)}
                    </small>
                    <h3>{valueText(item.service)}</h3>
                    <p>{valueText(item.status)}</p>
                  </div>
                  <Link
                    className="button"
                    href={
                      (resource === 'staff' ? '/jadwal/' : '/pesanan/') +
                      encodeURIComponent(item.id)
                    }
                  >
                    Lihat Detail
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p>
              Belum ada{' '}
              {resource === 'staff'
                ? 'jadwal untuk petugas ini'
                : 'pesanan untuk pelanggan ini'}
              .
            </p>
          )}
        </section>
      )}
      <DialogTrigger
        label={'Ubah ' + config.singular}
        title={'Detail & Ubah ' + config.singular}
        subtitle={'#' + id}
        wide={resource === 'orders'}
        dialogClass={resource === 'orders' ? 'order-form-dialog' : ''}
      >
        <ResourceFormServer resource={resource} record={record} />
      </DialogTrigger>
    </div>
  );
}
export async function ResourceNewPage({ resource }: { resource: Resource }) {
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
