import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());
const execute = vi.hoisted(() => vi.fn());
const resolveBookableServiceId = vi.hoisted(() => vi.fn());

let db: DatabaseSync;

vi.mock('../src/lib/db.js', () => ({ pool: { query, execute } }));
vi.mock('../src/model/booking.model.js', () => ({ resolveBookableServiceId }));

import {
  findServices,
  findServiceSummary,
} from '../src/model/service.model.js';
import {
  getServices,
  getServiceDetail,
} from '../src/controller/customer/service.controller.js';

const services = [
  {
    id: 1, name: 'Cuci Mobil', categoryId: 1, categoryName: 'Kecantikan',
    description: null, price: 150000, durationMinutes: 60, imageUrl: null,
    isActive: 1, createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: 2, name: 'Cuci Motor', categoryId: 1, categoryName: 'Kecantikan',
    description: null, price: 75000, durationMinutes: 45, imageUrl: null,
    isActive: 1, createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: 3, name: 'Cuci Sepeda', categoryId: 1, categoryName: 'Kecantikan',
    description: null, price: 50000, durationMinutes: 30, imageUrl: null,
    isActive: 1, createdAt: new Date(), updatedAt: new Date(),
  },
];

function fakeResponse() {
  let body: unknown = null;
  const res: any = {
    status: vi.fn(() => res),
    json: vi.fn((b: unknown) => {
      body = b;
      return res;
    }),
  };
  return {
    res,
    get body(): unknown {
      return body;
    },
  };
}

function fakeRequest(
  q: Record<string, string> = {},
  params: Record<string, string> = {},
) {
  return { query: q, params } as any;
}

beforeEach(() => {
  query.mockReset();
  execute.mockReset();
  resolveBookableServiceId.mockReset();

  db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE bookings (id INTEGER PRIMARY KEY, service_id INTEGER, status TEXT);
    CREATE TABLE reviews (id INTEGER PRIMARY KEY, service_id INTEGER, booking_id INTEGER, rating INTEGER);
  `);
  db.exec(`
    INSERT INTO bookings VALUES
      (101,1,'completed'),(102,1,'completed'),(103,1,'completed'),(104,1,'completed'),(105,1,'completed'),
      (106,1,'pending'),(107,1,'cancelled'),
      (201,2,'completed'),(202,2,'completed'),(203,2,'completed'),
      (204,2,'pending'),(205,2,'pending'),(206,2,'cancelled');
    INSERT INTO reviews VALUES
      (1,1,101,5),(2,1,102,4),(3,1,103,5),(4,2,201,5),
      (5,1,106,1),(6,2,204,1);
  `);

  resolveBookableServiceId.mockImplementation((id: string) => {
    const n = Number(id);
    return Number.isInteger(n) && n > 0 ? n : null;
  });

  query.mockImplementation((sql: unknown, params?: unknown) => {
    const s = String(sql);
    const p = params as unknown[] | undefined;
    if (s.includes('FROM services')) {
      if (s.includes('WHERE s.id =') && p) {
        const id = Number(p[0]);
        return Promise.resolve([[services.find((x) => x.id === id)]]);
      }
      return Promise.resolve([services]);
    }
    if (s.includes('FROM service_inclusions')) return Promise.resolve([[]]);
    return Promise.resolve([[]]);
  });

  execute.mockImplementation((sql: unknown, params?: unknown) => {
    const stmt = db.prepare(String(sql));
    const rows = stmt.all(...((params as unknown[]) ?? []));
    const normalized = rows.map((row: Record<string, unknown>) => {
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        out[key] = typeof value === 'number' ? String(value) : value;
      }
      return out;
    });
    return Promise.resolve([normalized]);
  });
});

afterEach(() => {
  db.close();
});

describe('layanan: statistik ringkas (list + detail)', () => {
  it('findServiceSummary hanya hitung completed, rating null tanpa ulasan, dan normalisasi string ke angka', async () => {
    const result = await findServiceSummary([1, 2, 3]);
    const byId = new Map(result.map((r) => [r.serviceId, r]));
    expect(byId.get(1)!.orderCount).toBe(5); // 7 booking total, 5 completed
    expect(byId.get(1)!.reviewCount).toBe(3);
    expect(byId.get(1)!.rating).toBeCloseTo(14 / 3);
    expect(byId.get(2)!.orderCount).toBe(3); // 6 booking total, 3 completed
    expect(byId.get(2)!.reviewCount).toBe(1);
    expect(byId.get(2)!.rating).toBe(5);
    expect(byId.get(3)!.orderCount).toBe(0);
    expect(byId.get(3)!.reviewCount).toBe(0);
    expect(byId.get(3)!.rating).toBeNull();
    for (const r of result) {
      expect(typeof r.rating).toBe(r.rating === null ? 'object' : 'number');
      expect(typeof r.reviewCount).toBe('number');
      expect(typeof r.orderCount).toBe('number');
    }
  });

  it('ulasan tidak menggandakan orderCount (completed vs pending/cancelled)', async () => {
    const response = fakeResponse();
    let nextError: unknown = null;
    await getServices(fakeRequest(), response.res, (err: unknown) => {
      nextError = err;
    });
    if (nextError) throw nextError;
    expect(response.res.status).toHaveBeenCalledWith(200);
    expect(response.res.json).toHaveBeenCalledTimes(1);
    const body = response.body as { data: unknown[] };
    const byId = new Map(body.data.map((d: any) => [d.id, d]));
    expect(body.data).toHaveLength(3);
    expect(byId.get(1)!.orderCount).toBe(5); // tidak 7
    expect(byId.get(1)!.reviewCount).toBe(3); // orderCount tidak dikalikan ulasan
    expect(byId.get(2)!.orderCount).toBe(3); // completed saja, pending/cancelled diabaikan
    expect(byId.get(2)!.reviewCount).toBe(1);
    expect(byId.get(3)!.rating).toBeNull();
    expect(byId.get(3)!.reviewCount).toBe(0);
    expect(byId.get(3)!.orderCount).toBe(0);
  });

  it('pertahankan filter aktif/category/search dan urutan default name', async () => {
    const { res } = fakeResponse();
    await getServices(fakeRequest({ search: 'mobil', category: '1' }), res, () => {});
    const [sql, params] = query.mock.calls[0] as [unknown, unknown[]];
    expect(String(sql)).toContain('ORDER BY s.name ASC');
    expect(params[0]).toBe(1); // activeOnly true
  });

  it('detail mempertahankan orderCount dan rating tidak direset', async () => {
    const response = fakeResponse();
    let nextError: unknown = null;
    await getServiceDetail(fakeRequest({}, { id: '1' }), response.res, (err: unknown) => {
      nextError = err;
    });
    if (nextError) throw nextError;
    const d = (response.body as { data: unknown }).data as any;
    expect(d.orderCount).toBe(5);
    expect(d.reviewCount).toBe(3);
    expect(d.rating).toBeCloseTo(14 / 3);

    const response3 = fakeResponse();
    await getServiceDetail(fakeRequest({}, { id: '3' }), response3.res, () => {});
    const d3 = (response3.body as { data: unknown }).data as any;
    expect(d3.rating).toBeNull();
    expect(d3.reviewCount).toBe(0);
    expect(d3.orderCount).toBe(0);
  });

  it('count dan detail konsisten untuk layanan yang sama', async () => {
    const response = fakeResponse();
    let nextError: unknown = null;
    await getServices(fakeRequest(), response.res, (err: unknown) => {
      nextError = err;
    });
    if (nextError) throw nextError;
    const list = (response.body as { data: unknown[] }).data as any[];
    const byId = new Map(list.map((d) => [d.id, d]));

    const responseD = fakeResponse();
    let nextErrorD: unknown = null;
    await getServiceDetail(fakeRequest({}, { id: '2' }), responseD.res, (err: unknown) => {
      nextErrorD = err;
    });
    if (nextErrorD) throw nextErrorD;
    const detail = (responseD.body as { data: unknown }).data as any;

    expect(detail.orderCount).toBe(byId.get(2)!.orderCount);
    expect(detail.reviewCount).toBe(byId.get(2)!.reviewCount);
    expect(detail.rating).toBe(byId.get(2)!.rating);
  });
});
