import { deliveryLabels, type Delivery } from '@/types/cleaner';
export function DeliveryBadge({ delivery }: { delivery: Delivery }) {
  return (
    <span
      className={'delivery-badge delivery-' + delivery.status}
      title={
        delivery.mode === 'simulation'
          ? 'Pengiriman percobaan. Tidak ada pesan WhatsApp sungguhan yang dikirim.'
          : undefined
      }
    >
      <i />
      {deliveryLabels[delivery.status]}
    </span>
  );
}
