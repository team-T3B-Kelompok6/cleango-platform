import type { FormState } from './index';

export interface PromoInput {
  name: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount: number | null;
  minPurchase: number;
  scope: 'all' | 'services';
  serviceIds: string[];
  startsOn: string;
  endsOn: string;
  usageLimit: number | null;
  perCustomerLimit: number;
  stackable: boolean;
  active: boolean;
}
export interface Promo extends PromoInput {
  id: string;
  usedCount?: number;
}
export interface PromoActionState extends FormState {
  promo?: Promo;
}
