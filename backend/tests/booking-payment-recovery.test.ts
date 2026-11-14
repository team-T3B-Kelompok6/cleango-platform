import { beforeEach, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ getConnection: vi.fn() }));
vi.mock('../src/lib/db.js', () => ({ pool: db }));
import { BookingConflictError, createBooking } from '../src/model/booking.model.js';

const input = { customerId: 1, serviceId: 2, addressId: 3, date: '2030-01-02', time: '10:00' as const, notes: 'Uji' };
let existing: Record<string, unknown>[];
let execute: ReturnType<typeof vi.fn>;
beforeEach(() => {
  existing = [];
  execute = vi.fn(async (sql: string) => {
    if (sql.includes('GET_LOCK')) return [[{ ok: 1 }]];
    if (sql.includes('FROM bookings') && sql.includes('customer_id = ?')) return [existing];
    if (sql.includes('FROM services')) return [[{ price: 100000, duration_minutes: 60 }]];
    if (sql.includes('FROM cleaners')) return [[{ total: 3 }]];
    if (sql.includes('FROM addresses')) return [[{ id: 3 }]];
    if (sql.includes('INSERT INTO bookings')) return [{ insertId: 42 }];
    return [[]];
  });
  db.getConnection.mockResolvedValue({ execute, beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() });
});
it('creates awaiting payment notice, never booking success, before payment', async () => {
  await createBooking(input);
  const notice = execute.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO notifications'));
  expect(notice?.[0]).toContain('Menunggu Pembayaran');
  expect(notice?.[0]).not.toContain('Pesanan Dibuat');
});
it('reuses identical pending booking after create response timeout or reopening', async () => {
  existing = [{ id: 42, code: 'CG-42', status: 'awaiting_payment', addressId: 3, notes: 'Uji', promoId: null }];
  expect(await createBooking(input)).toMatchObject({ id: 42, code: 'CG-42', reused: true });
  expect(execute.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO'))).toBe(false);
});
it('never reuses paid/confirmed booking or changed details', async () => {
  for (const changes of [{ status: 'confirmed' }, { addressId: 4 }, { notes: 'Changed' }, { promoId: 9 }]) {
    existing = [{ id: 42, code: 'CG-42', status: 'awaiting_payment', addressId: 3, notes: 'Uji', promoId: null, ...changes }];
    await expect(createBooking(input)).rejects.toBeInstanceOf(BookingConflictError);
  }
});
