import { describe, expect, it } from 'vitest';
import {
  calculateDiscount,
  promoIssue,
} from '../src/controller/customer/promo.controller.js';
import type { Promo } from '../src/model/promo.model.js';

function promo(overrides: Partial<Promo> = {}): Promo {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const year = Number(today.slice(0, 4));
  return {
    id: '1',
    name: 'Promo',
    code: 'PROMO',
    discountType: 'percentage',
    discountValue: 20,
    maxDiscount: 50000,
    minPurchase: 100000,
    scope: 'all',
    serviceIds: [],
    startsOn: `${year - 1}-01-01`,
    endsOn: `${year + 1}-12-31`,
    usageLimit: 100,
    perCustomerLimit: 1,
    stackable: false,
    active: true,
    usedCount: 0,
    ...overrides,
  };
}

describe('calculateDiscount', () => {
  it('rounds a percentage discount', () => {
    expect(calculateDiscount(promo({ discountValue: 20 }), 150000)).toBe(30000);
    expect(calculateDiscount(promo({ discountValue: 15 }), 100000)).toBe(15000);
  });

  it('caps a percentage discount by maxDiscount', () => {
    expect(
      calculateDiscount(promo({ discountValue: 50, maxDiscount: 20000 }), 100000),
    ).toBe(20000);
  });

  it('applies a fixed discount', () => {
    expect(
      calculateDiscount(
        promo({ discountType: 'fixed', discountValue: 25000, maxDiscount: null }),
        100000,
      ),
    ).toBe(25000);
  });

  it('never discounts more than the price', () => {
    expect(
      calculateDiscount(
        promo({ discountType: 'fixed', discountValue: 900000, maxDiscount: null }),
        100000,
      ),
    ).toBe(100000);
  });

  it('returns 0 for a non positive price', () => {
    expect(calculateDiscount(promo(), 0)).toBe(0);
  });
});

describe('promoIssue', () => {
  it('accepts an active promo above the minimum', () => {
    expect(promoIssue(promo(), 150000, null)).toBeNull();
  });

  it('rejects an inactive promo', () => {
    expect(promoIssue(promo({ active: false }), 150000, null)).toContain('tidak aktif');
  });

  it('rejects an expired promo', () => {
    expect(
      promoIssue(promo({ endsOn: '2000-01-01' }), 150000, null),
    ).toContain('kedaluwarsa');
  });

  it('rejects a promo that has not started', () => {
    expect(
      promoIssue(promo({ startsOn: '2999-01-01' }), 150000, null),
    ).toContain('belum berlaku');
  });

  it('rejects an exhausted quota', () => {
    expect(
      promoIssue(promo({ usageLimit: 5, usedCount: 5 }), 150000, null),
    ).toContain('Kuota');
  });

  it('rejects a total below the minimum purchase', () => {
    expect(promoIssue(promo({ minPurchase: 200000 }), 150000, null)).toContain(
      'Minimal transaksi',
    );
  });

  it('enforces the service scope', () => {
    const scoped = promo({ scope: 'services', serviceIds: ['7', '8'] });
    expect(promoIssue(scoped, 150000, 7)).toBeNull();
    expect(promoIssue(scoped, 150000, 9)).toContain('tidak berlaku untuk layanan');
    expect(promoIssue(scoped, 150000, null)).toContain('tidak berlaku untuk layanan');
  });

  it('ignores the service scope for an all-services promo', () => {
    expect(promoIssue(promo({ scope: 'all' }), 150000, 999)).toBeNull();
  });
});
