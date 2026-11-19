import { deliveryLabels, type Delivery } from '@/types/cleaner';

const toneClass: Record<Delivery['status'], string> = {
  not_sent: 'bg-surface-soft text-ink-muted',
  sending: 'bg-info-soft text-info',
  sent: 'bg-success-soft text-success',
  failed: 'bg-danger-soft text-danger',
  simulated: 'bg-warning-soft text-warning',
  manual_ready: 'bg-warning-soft text-warning',
};

/** Status pengiriman tautan/laporan (badge kecil dengan titik warna). */
export function DeliveryBadge({ delivery }: { delivery: Delivery }) {
  return (
    <span
      className={
        'inline-flex items-center gap-6 rounded-full px-8 py-4 text-xs leading-[1.55] ' +
        toneClass[delivery.status]
      }
      title={
        delivery.mode === 'simulation'
          ? 'Pengiriman percobaan. Tidak ada pesan WhatsApp sungguhan yang dikirim.'
          : undefined
      }
    >
      <i className="size-[6px] shrink-0 rounded-full bg-current" />
      {deliveryLabels[delivery.status]}
    </span>
  );
}
