import Link from 'next/link';
import type { Order } from '@/types';
import {
  DialogBody,
  DialogFooter,
  DialogTrigger,
  buttonVariants,
} from '@/components/ui';
import { DialogCloseAction } from '@/components/ui/DialogTrigger';
import { displayId } from '@/lib/display';
import { rupiah } from '@/lib/resources';
import { REPORT_COPY } from '../data/reportCopy';

/** Dialog rincian satu pesanan selesai di daftar laporan. */
export function InvoiceDialog({ order }: { order: Order }) {
  return (
    <DialogTrigger
      label={REPORT_COPY.invoice.label}
      title={REPORT_COPY.invoice.title}
      subtitle={'#' + displayId(order.id)}
      className={buttonVariants({ variant: 'ghost', size: 'sm' })}
      ariaLabel={REPORT_COPY.invoice.label + ' pesanan #' + displayId(order.id)}
    >
      <DialogBody className="flex flex-col gap-12">
        <div className="min-w-0">
          <h3 className="text-lg leading-[1.4] font-semibold break-words text-ink">
            {order.customer}
          </h3>
          <p className="mt-8 text-base leading-[1.7] break-words text-ink-muted">
            {order.address}
          </p>
        </div>
        <div className="flex items-center justify-between gap-20 border-t border-line py-20">
          <span className="min-w-0 text-base break-words">{order.service}</span>
          <strong className="text-base whitespace-nowrap text-accent">
            {rupiah(order.price)}
          </strong>
        </div>
        <small className="text-xs leading-[1.6] text-ink-muted">
          {order.paymentMethod
            ? REPORT_COPY.invoice.payment + order.paymentMethod
            : REPORT_COPY.invoice.noPayment}
        </small>
      </DialogBody>
      <DialogFooter>
        <DialogCloseAction />
        <Link
          className={buttonVariants({ variant: 'primary' })}
          href={'/pesanan/' + encodeURIComponent(order.id)}
        >
          {REPORT_COPY.invoice.open}
        </Link>
      </DialogFooter>
    </DialogTrigger>
  );
}
