import Link from 'next/link';
import type { Customer, Order } from '@/types';
import { displayId } from '@/lib/display';
import { rupiah } from '@/lib/resources';
import {
  customerJoinedLabel,
  customerRatingLabel,
  customerStats,
} from '@/lib/customers';
import { orderTimeText } from '@/lib/order-flow';
import { StatusBadge, UiIcon } from '@/components/ui';
import { Initials } from '@/components/ui';
import { InfoCard } from './InfoCard';
import {
  detailGridClass,
  statItemClass,
  statLabelClass,
  statStripClass,
  statValueClass,
} from '../data/customerStyles';

function dateText(value: unknown) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))
    return 'Belum tersedia';
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
}

/** Detail customer: identitas, statistik, kontak, dan riwayat pesanan. */
export function CustomerDetail({
  customer,
  orders,
}: {
  customer: Customer;
  orders: Order[];
}) {
  const stats = customerStats(orders, customer);
  const rating = customerRatingLabel(customer);
  return (
    <>
      <div className="flex flex-wrap items-center gap-12">
        <Initials name={customer.name} />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg leading-[1.5] font-semibold break-words text-ink">
            {customer.name}
          </h3>
          <p className="mt-1 text-sm leading-[1.65] text-ink-muted">
            Terdaftar sejak {customerJoinedLabel(customer.joined)}
          </p>
        </div>
        <StatusBadge status={customer.active ? 'Aktif' : 'Nonaktif'} />
      </div>

      <div className={statStripClass}>
        <div className={statItemClass}>
          <small className={statLabelClass}>Total selesai</small>
          <strong className={statValueClass}>
            {stats.completed.length}x Order
          </strong>
        </div>
        <div className={statItemClass}>
          <small className={statLabelClass}>Nilai pesanan selesai</small>
          <strong className={statValueClass}>{rupiah(stats.totalSpent)}</strong>
        </div>
        <div className={statItemClass}>
          <small className={statLabelClass}>Rating ke kru</small>
          <strong className={statValueClass}>
            {rating}
            {rating !== 'Belum ada' && (
              <UiIcon name="star" className="size-[14px] text-warning" />
            )}
          </strong>
        </div>
      </div>

      <div className={detailGridClass}>
        <InfoCard icon="phone" label="Kontak WhatsApp & email">
          <strong className="block text-base leading-[1.65] font-semibold break-words text-ink">
            {customer.phone || 'Nomor belum ditambahkan'}
          </strong>
          <p className="mt-1 text-sm leading-[1.6] break-words text-ink-muted">
            {customer.email || 'Email belum ditambahkan'}
          </p>
        </InfoCard>
        <InfoCard icon="pin" label="Alamat utama">
          <strong className="block text-base leading-[1.65] font-semibold break-words text-ink">
            {customer.address || 'Alamat belum ditambahkan'}
          </strong>
          {customer.area && (
            <p className="mt-1 text-sm leading-[1.6] break-words text-ink-muted">
              {customer.area}
            </p>
          )}
        </InfoCard>
        <InfoCard icon="services" label="Layanan favorit">
          <strong className="block text-base leading-[1.65] font-semibold break-words text-ink">
            {stats.favorite?.[0] || 'Belum ada pesanan selesai'}
          </strong>
          {stats.favorite && (
            <p className="mt-1 text-sm leading-[1.6] text-ink-muted">
              {stats.favorite[1]}x pesanan selesai
            </p>
          )}
        </InfoCard>
        <InfoCard icon="person" label="Kru langganan">
          <strong className="block text-base leading-[1.65] font-semibold break-words text-ink">
            {stats.regular?.[0] || 'Belum ada pesanan selesai'}
          </strong>
          {stats.regular && (
            <p className="mt-1 text-sm leading-[1.6] text-ink-muted">
              {stats.regular[1]}x pesanan selesai
            </p>
          )}
        </InfoCard>
      </div>

      <details className="border-t border-line pt-16 text-sm">
        <summary className="cursor-pointer font-semibold text-ink">
          Riwayat pesanan{' '}
          <span className="ml-8 font-normal text-ink-muted">
            {stats.orders.length} pesanan
          </span>
        </summary>
        {stats.orders.length ? (
          <div className="mt-12 flex flex-col gap-8">
            {stats.orders.map((order) => (
              <Link
                key={order.id}
                href={'/pesanan/' + encodeURIComponent(order.id)}
                className="flex flex-wrap items-center gap-10 rounded-md border border-line p-12 transition-colors hover:border-line-strong"
              >
                <div className="min-w-0 flex-1">
                  <strong className="block break-words text-ink">
                    #{displayId(order.id)} · {order.service}
                  </strong>
                  <small className="mt-1 block text-xs leading-[1.6] text-ink-muted">
                    {dateText(order.date)} · {orderTimeText(order)}
                  </small>
                </div>
                <StatusBadge status={order.status} />
                <UiIcon name="chevron" className="size-[14px] text-ink-faint" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-12 text-sm text-ink-muted">
            Belum ada pesanan yang tercatat.
          </p>
        )}
      </details>
    </>
  );
}
