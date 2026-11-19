import { promoListState } from '@/lib/promos';
import type { Service } from '@/types';
import { PromoManager } from './PromoManager';

export async function PromoManagerServer({
  services,
  today,
}: {
  services: Service[];
  today: string;
}) {
  const { promos, message } = await promoListState();
  return (
    <PromoManager
      promos={promos}
      message={message}
      services={services}
      today={today}
    />
  );
}
