import Image from 'next/image';
import Link from 'next/link';
import { list } from '@/lib/api';
import { rupiah } from '@/lib/resources';
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
import { Badge } from './StatusBadge';
import { UiIcon, type UiIconName } from './UiIcon';
import { DialogNote } from './DialogNote';
import {
  bookingStart,
  workTimeRange,
  orderTimeText,
  newestOrderFirst,
} from '@/lib/order-flow';
import { withOrderWorkTimes } from '@/lib/order-work-times';

function dateText(value: unknown) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      })
    : 'Belum tersedia';
}
function frequent(values: string[]) {
  const counts = new Map<string, number>();
  values
    .filter(Boolean)
    .forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts].sort((a, b) => b[1] - a[1])[0];
}
function InfoCard({
  icon,
  label,
  children,
}: {
  icon: UiIconName;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="detail-info-card">
      <span className="detail-info-icon">
        <UiIcon name={icon} />
      </span>
      <div>
        <h3>{label}</h3>
        {children}
      </div>
    </div>
  );
}
function BookingPreview({
  resource,
  record,
}: {
  resource: 'orders' | 'schedules';
  record: RecordData;
}) {
  const schedule = resource === 'schedules';
  const values = schedule
    ? [
        ['Petugas', String(record.staff || 'Belum ditugaskan')],
        ['Tanggal', dateText(record.date)],
        ['Jam shift', String(record.time)],
        ['Status jadwal', String(record.status)],
      ]
    : [
        ['Pelanggan', String(record.customer)],
        ['Layanan', String(record.service)],
        ['Tanggal', dateText(record.date)],
        ['Jam booking', bookingStart(record)],
        ...(record.status === 'Selesai'
          ? [
              [
                'Jam pengerjaan',
                workTimeRange(record) || 'Waktu mulai–selesai belum tercatat',
              ],
            ]
          : []),
        ['Petugas', (record as Order).staff?.join(' & ') || 'Belum ditugaskan'],
        ['Total biaya', rupiah(Number(record.price))],
      ];
  return (
    <>
      <div className="booking-preview-heading">
        <strong>#{displayId(record.id)}</strong>
        <Badge status={String(record.status)} />
      </div>
      <dl className="record-facts">
        {values.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {!schedule && (
        <>
          <section className="detail-content-section">
            <h3>Alamat pengerjaan</h3>
            <p>{String(record.address || 'Belum tersedia')}</p>
          </section>
          <section className="detail-content-section">
            <h3>Catatan pelanggan</h3>
            <p>
              {typeof record.notes === 'string' && record.notes.trim()
                ? record.notes
                : 'Tidak ada catatan pelanggan untuk pesanan ini.'}
            </p>
          </section>
        </>
      )}
    </>
  );
}
async function CustomerPreview({ customer }: { customer: Customer }) {
  const orders = (await withOrderWorkTimes(await list<Order>('orders'))).filter(
    (order) =>
      order.customerId
        ? order.customerId === customer.id
        : order.customer === customer.name,
  );
  const completed = orders
    .filter((order) => order.status === 'Selesai')
    .sort(newestOrderFirst);
  const totalSpent = completed.reduce((sum, order) => sum + order.price, 0);
  const favorite = frequent(completed.map((order) => order.service));
  const regular = frequent(
    completed.flatMap((order) => [...new Set(order.staff)]),
  );
  const rating =
    typeof customer.crewRating === 'number' &&
    customer.crewRating >= 0 &&
    customer.crewRating <= 5
      ? customer.crewRating.toFixed(1)
      : 'Belum ada';
  return (
    <>
      <div className="customer-detail-identity">
        <span className="detail-initials">
          {customer.name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word[0])
            .join('')}
        </span>
        <div>
          <h3>{customer.name}</h3>
          <p>Terdaftar sejak {dateText(customer.joined)}</p>
        </div>
        <Badge status={customer.active ? 'Aktif' : 'Nonaktif'} />
      </div>
      <div className="detail-stat-strip">
        <div>
          <small>Total selesai</small>
          <strong>{completed.length}× Order</strong>
        </div>
        <div>
          <small>Nilai pesanan selesai</small>
          <strong>{rupiah(totalSpent)}</strong>
        </div>
        <div>
          <small>Rating ke kru</small>
          <strong>
            {rating}
            {rating !== 'Belum ada' && <UiIcon name="star" />}
          </strong>
        </div>
      </div>
      <div className="detail-info-grid">
        <InfoCard icon="phone" label="Kontak WhatsApp & email">
          <strong>{customer.phone || 'Nomor belum ditambahkan'}</strong>
          <p>{customer.email || 'Email belum ditambahkan'}</p>
        </InfoCard>
        <InfoCard icon="pin" label="Alamat utama">
          <strong>{customer.address || 'Alamat belum ditambahkan'}</strong>
          {customer.area && <p>{customer.area}</p>}
        </InfoCard>
        <InfoCard icon="services" label="Layanan favorit">
          <strong>{favorite?.[0] || 'Belum ada pesanan selesai'}</strong>
          {favorite && <p>{favorite[1]}× pesanan selesai</p>}
        </InfoCard>
        <InfoCard icon="person" label="Kru langganan">
          <strong>{regular?.[0] || 'Belum ada pesanan selesai'}</strong>
          {regular && <p>{regular[1]}× pesanan selesai</p>}
        </InfoCard>
      </div>
      <details className="detail-related-records">
        <summary>
          Riwayat pesanan <span>{orders.length} pesanan</span>
        </summary>
        {orders.length ? (
          <div>
            {orders.map((order) => (
              <Link
                key={order.id}
                href={'/pesanan/' + encodeURIComponent(order.id)}
              >
                <div>
                  <strong>
                    #{displayId(order.id)} · {order.service}
                  </strong>
                  <small>
                    {dateText(order.date)} · {orderTimeText(order)}
                  </small>
                </div>
                <Badge status={order.status} />
                <UiIcon name="chevron" />
              </Link>
            ))}
          </div>
        ) : (
          <p>Belum ada pesanan yang tercatat.</p>
        )}
      </details>
    </>
  );
}
function FaqPreview({ faq }: { faq: Faq }) {
  return (
    <>
      <div className="faq-preview-tags">
        <span>
          Kategori:{' '}
          <b className="detail-category">
            <UiIcon name="tag" />
            {faq.category}
          </b>
        </span>
        <span
          className={'status-badge ' + (faq.published ? 'green' : 'neutral')}
        >
          <i />
          {faq.published ? 'Aktif di Aplikasi' : 'Draf'}
        </span>
      </div>
      <section className="faq-preview-question">
        <span className="faq-letter">Q</span>
        <div>
          <h3>Pertanyaan</h3>
          <p>{faq.question}</p>
        </div>
      </section>
      <section className="faq-preview-answer">
        <span className="faq-letter">A</span>
        <div>
          <h3>Jawaban</h3>
          <p>{faq.answer}</p>
        </div>
      </section>
      <div className="faq-preview-meta">
        <span>
          <UiIcon name="eye" />
          {typeof faq.viewCount === 'number' && faq.viewCount >= 0
            ? 'Dibaca ' + faq.viewCount.toLocaleString('id-ID') + ' kali'
            : 'Statistik pembaca belum tersedia'}
        </span>
        <span>
          Terakhir diperbarui
          <br />
          {dateText(faq.updatedAt)}
        </span>
      </div>
      <DialogNote title="Tips operasional CleanGo" tip>
        <p>
          Pastikan jawaban sesuai layanan dan prosedur terbaru, terutama saat
          ada perubahan harga, kebijakan, atau jadwal.
        </p>
      </DialogNote>
    </>
  );
}
function ServicePreview({ service }: { service: Service }) {
  const promo = false;
  return (
    <>
      {service.imageUrl ? (
        <Image
          className="service-preview-photo"
          src={service.imageUrl}
          alt={service.name}
          width={800}
          height={450}
          unoptimized
        />
      ) : (
        <div className="service-preview-empty">
          <UiIcon name="image" />
          <span>Foto layanan belum ditambahkan</span>
        </div>
      )}
      <div className="service-preview-heading">
        <div>
          <span className="detail-category">{service.category}</span>
          <h3>{service.name}</h3>
        </div>
        <Badge status={service.active ? 'Aktif' : 'Nonaktif'} />
      </div>
      <div className="service-preview-price">
        <div>
          {promo && <del>{rupiah(service.price)}</del>}
          <strong>
            {rupiah(promo ? service.discountPrice! : service.price)}
          </strong>
          <small>/ sesi</small>
        </div>
        <span>
          <UiIcon name="clock" />
          {service.duration}
        </span>
      </div>
      <section className="detail-content-section">
        <h3>Deskripsi layanan</h3>
        <p>{service.description || 'Deskripsi belum ditambahkan.'}</p>
      </section>
      <section className="detail-content-section">
        <h3>Fasilitas termasuk</h3>
        {service.features?.length ? (
          <ul className="service-preview-features">
            {service.features.map((feature, index) => (
              <li key={index}>
                <UiIcon name="tick" />
                {feature}
              </li>
            ))}
          </ul>
        ) : (
          <p>Fasilitas belum ditambahkan.</p>
        )}
      </section>
    </>
  );
}
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
        <CustomerPreview customer={record as Customer} />
      )}
      {resource === 'faqs' && <FaqPreview faq={record as Faq} />}
      {resource === 'services' && (
        <ServicePreview service={record as Service} />
      )}
    </RecordDetailModal>
  );
}
