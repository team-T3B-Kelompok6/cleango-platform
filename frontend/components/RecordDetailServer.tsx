import { list } from '@/lib/api';
import { whatsappLink } from '@/lib/whatsapp';
import type {
  Customer,
  Faq,
  Order,
  RecordData,
  Resource,
  Service,
} from '@/types';
import { displayId } from '@/lib/display';
import { RecordDetailModal } from './RecordDetailModal';
import { ResourceFormServer } from './ResourceFormServer';
import { ServicePreview } from '@/components/services';
import { FaqDetail } from '@/components/faq';
import { CustomerDetail } from '@/components/customers';
import { BookingPreview } from '@/components/orders/detail';
import { withOrderWorkTimes } from '@/lib/order-work-times';

export async function RecordDetailServer({
  resource,
  record,
  closeHref,
}: {
  resource: Resource;
  record: RecordData;
  closeHref: string;
}) {
  if (resource === 'orders') [record] = await withOrderWorkTimes([record]);
  const subtitle =
    resource === 'orders'
      ? 'Rincian pesanan dan penugasan petugas.'
      : resource === 'schedules'
        ? '#' +
          displayId(record.id) +
          ' · Ringkasan jadwal dan penugasan petugas.'
        : resource === 'faqs'
          ? 'Tampilan pertanyaan umum yang dapat dilihat pelanggan di aplikasi.'
          : resource === 'customers'
            ? 'ID Pelanggan: #' + displayId(record.id)
            : '#' +
              displayId(record.id) +
              ' · Informasi layanan yang tampil di aplikasi.';
  return (
    <RecordDetailModal
      key={resource + record.id}
      closeHref={closeHref}
      resource={resource}
      id={record.id}
      subtitle={subtitle}
      href={
        resource === 'customers' && !record.id.startsWith('DEMO-')
          ? whatsappLink(
              String(record.phone ?? ''),
              'Halo ' + record.name + ', saya Admin CleanGo.',
            )
          : undefined
      }
      form={<ResourceFormServer resource={resource} record={record} />}
    >
      {(resource === 'orders' || resource === 'schedules') && (
        <BookingPreview resource={resource} record={record} />
      )}
      {resource === 'customers' && (
        <CustomerDetail
          customer={record as Customer}
          orders={await withOrderWorkTimes(await list<Order>('orders'))}
        />
      )}
      {resource === 'faqs' && <FaqDetail faq={record as Faq} />}
      {resource === 'services' && (
        <ServicePreview service={record as Service} />
      )}
    </RecordDetailModal>
  );
}
