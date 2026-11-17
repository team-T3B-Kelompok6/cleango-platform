import type { Order } from '@/types';
import { rupiah } from '@/lib/resources';
import { InvoiceDialog } from './InvoiceDialog';
import { reportAmountClass, reportRowClass, reportRowMainClass } from './data';

/** Baris pesanan selesai pada tab Ringkasan Bulanan. */
export function ReportRow({ order }: { order: Order }) {
  const payment = order.paymentMethod
    ? ' · Pembayaran: ' + order.paymentMethod
    : '';
  return (
    <article className={reportRowClass}>
      <div className={reportRowMainClass}>
        <small className="text-xs leading-[1.5] text-ink-faint">
          #{order.invoiceId || order.id} · {order.date}
        </small>
        <h3 className="mt-5 text-md leading-[1.4] font-semibold break-words text-ink">
          {order.customer}
        </h3>
        <p className="mt-4 text-xs leading-[1.6] break-words text-ink-muted">
          {order.service}
          {payment}
        </p>
      </div>
      <strong className={reportAmountClass}>{rupiah(order.price)}</strong>
      <InvoiceDialog order={order} />
    </article>
  );
}
