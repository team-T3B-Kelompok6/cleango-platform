import { tone } from '@/lib/resources';
import { orderStatusLabel } from '@/lib/order-flow';
export function Badge({ status }: { status: string }) {
  return (
    <span className={'status-badge ' + tone(status)}>
      <i />
      {orderStatusLabel(status)}
    </span>
  );
}
