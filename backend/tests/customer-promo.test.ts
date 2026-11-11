import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const db = vi.hoisted(() => ({ query: vi.fn() }));
const auth = vi.hoisted(() => ({ isTokenRevoked: vi.fn() }));
vi.mock('../src/lib/db.js', () => ({ pool: db }));
vi.mock('../src/model/user.model.js', () => auth);
vi.mock('../src/lib/jwt.js', () => ({
  verifyAccessToken: (token: string) => {
    if (!['customer-10', 'customer-20', 'admin'].includes(token)) throw new Error('Invalid token');
    return {
      id: token === 'customer-20' ? 20 : 10,
      email: 'promo@example.test',
      role: token === 'admin' ? 'admin' : 'customer',
      issuedAt: 1,
    };
  },
}));

import { globalErrorHandler } from '../src/middleware/error.middleware.js';
import { customerPromoRouter } from '../src/routes/customer/promo.routes.js';
import { countPromoUsageByCustomer, listActivePromos } from '../src/model/promo.model.js';
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

const app = express();
app.use(express.json());
app.use('/promos', customerPromoRouter);
app.use(globalErrorHandler);

function promoRow() {
  return {
    id: 1,
    name: 'Promo',
    code: 'PROMO',
    discountType: 'percentage',
    discountValue: 20,
    maximumDiscount: 50000,
    minimumOrder: 100000,
    quota: 100,
    usedCount: 2,
    startsAt: new Date('2000-01-01T00:00:00Z'),
    endsAt: new Date('2999-12-31T00:00:00Z'),
    isActive: 1,
    scope: 'all',
    serviceIds: [],
    perCustomerLimit: 2,
    stackable: 0,
  };
}

beforeEach(() => {
  db.query.mockReset();
  auth.isTokenRevoked.mockReset().mockResolvedValue(false);
});

describe('customer promo queries', () => {
  it('keeps global rules and filters usage only for the requested customer', async () => {
    db.query.mockResolvedValue([[promoRow()]]);
    const promos = await listActivePromos(20);
    const [sql, params] = db.query.mock.calls[0]!;
    expect(sql).toContain('is_active = TRUE AND starts_at <= NOW() AND ends_at > NOW()');
    expect(sql).toContain('(quota IS NULL OR used_count < quota)');
    expect(sql).toMatch(
      /SELECT COUNT\(\*\) FROM promo_usages\s+WHERE promo_id = promos\.id AND user_id = \?[\s\S]*status IN \('reserved', 'redeemed'\)/,
    );
    expect(params).toEqual([20]);
    expect(promos[0]?.perCustomerLimit).toBe(2);
    expect(sql).not.toContain('bookings');
  });

  it('counts every recorded usage, including cancelled bookings, as the booking guard does', async () => {
    db.query.mockResolvedValue([[{ total: '2' }]]);
    expect(await countPromoUsageByCustomer(1, 10)).toBe(2);
    expect(db.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS total FROM promo_usages WHERE promo_id = ? AND user_id = ?',
      [1, 10],
    );
  });
});

describe('customer promo endpoints', () => {
  it('rejects guests, invalid sessions, admins and revoked sessions', async () => {
    for (const path of ['/promos', '/promos/validate']) {
      const call = () => path.endsWith('validate')
        ? request(app).post(path).send({ code: 'PROMO', amount: 150000 })
        : request(app).get(path);
      expect((await call()).status).toBe(401);
      expect((await call().set('Authorization', 'Bearer invalid')).status).toBe(401);
      expect((await call().set('Authorization', 'Bearer admin')).status).toBe(403);
      auth.isTokenRevoked.mockResolvedValueOnce(true);
      expect((await call().set('Authorization', 'Bearer customer-10')).status).toBe(401);
    }
    expect(db.query).not.toHaveBeenCalled();
  });

  it('lists promos using session identity instead of a supplied customer ID', async () => {
    db.query.mockResolvedValue([[]]);
    const response = await request(app).get('/promos?customerId=20')
      .set('Authorization', 'Bearer customer-10');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(db.query.mock.calls[0]?.[1]).toEqual([10]);
  });

  it('rejects usage 2 of limit 2 even when a different customer is supplied', async () => {
    db.query.mockResolvedValueOnce([[promoRow()]]).mockResolvedValueOnce([[{ total: 2 }]]);
    const response = await request(app).post('/promos/validate')
      .set('Authorization', 'Bearer customer-10')
      .send({ code: ' promo ', amount: 150000, customerId: 20 });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('PROMO_REJECTED');
    expect(response.body.message).toContain('Batas pemakaian promo');
    expect(db.query.mock.calls[0]?.[1]).toEqual(['PROMO']);
    expect(db.query.mock.calls[1]?.[1]).toEqual([1, 10]);
  });

  it('allows another customer and a customer with one remaining use', async () => {
    for (const [token, count] of [['customer-20', 0], ['customer-10', 1]] as const) {
      db.query.mockResolvedValueOnce([[promoRow()]]).mockResolvedValueOnce([[{ total: count }]]);
      const response = await request(app).post('/promos/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'PROMO', amount: 150000, serviceId: 7 });
      expect(response.status).toBe(200);
      expect(response.body.data.discountAmount).toBe(30000);
    }
  });

  it('does not accept a promo when usage lookup fails', async () => {
    db.query.mockResolvedValueOnce([[promoRow()]]).mockRejectedValueOnce(new Error('Unavailable'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await request(app).post('/promos/validate')
        .set('Authorization', 'Bearer customer-10')
        .send({ code: 'PROMO', amount: 150000 });
      expect(response.status).toBe(500);
      expect(response.body.data).toBeUndefined();
    } finally {
      log.mockRestore();
    }
  });
});

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

  it('rejects a promo when the per-customer limit is exhausted', () => {
    expect(promoIssue(promo({ perCustomerLimit: 2 }), 150000, null, 2)).toContain(
      'Batas pemakaian promo untuk akun ini sudah tercapai.',
    );
  });

  it('accepts a promo when the customer still has remaining quota', () => {
    expect(promoIssue(promo({ perCustomerLimit: 2 }), 150000, null, 1)).toBeNull();
  });
});
