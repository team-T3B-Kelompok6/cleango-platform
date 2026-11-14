import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/db.js', () => ({ pool: { execute: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../src/lib/midtrans.js', () => ({ createSession: vi.fn(), readSession: vi.fn() }));

import { pool } from '../src/lib/db.js';
import { AppError } from '../src/lib/AppError.js';
import { createSession as createMidtrans, readSession as readMidtrans } from '../src/lib/midtrans.js';
import { refreshBookingPayment } from '../src/model/payment.model.js';

type Row = Record<string, unknown>;
let session: Row;
let payment: Row;
let statements: string[];
let inTransaction: boolean;
const owner = 4;
const bookingId = 9;

function remote(status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELED' = 'COMPLETED') {
  return { sessionId: String(session.session_id ?? session.reference_id), referenceId: String(session.reference_id),
    status, amount: 1200, currency: 'IDR' as const, sessionType: 'PAY' as const, checkoutUrl: null, expiresAt: null };
}

async function execute(sql: string, values: unknown[] = []) {
  statements.push(sql);
  if (sql.startsWith('SELECT ps.*')) {
    expect(sql).toContain('INNER JOIN bookings b ON b.id = ps.booking_id');
    expect(sql).toContain('LEFT JOIN payments p ON p.booking_id = ps.booking_id');
    expect(sql).toContain("ps.reference_id NOT LIKE 'mid-%'");
    expect(sql).toContain('b.customer_id = ?');
    expect(sql).toContain("p.status IN ('pending', 'failed', 'expired')");
    expect(sql).toContain("p.method <> 'cash'");
    expect(sql).not.toContain('FOR UPDATE');
    const legacy = !String(session.reference_id).startsWith('mid-') && ['active', 'creating', 'unknown', 'completed'].includes(String(session.status));
    const eligible = values[0] === bookingId && values[1] === owner && (legacy || (payment.status !== 'paid' &&
      payment.method !== 'cash' && payment.gateway_reference === session.reference_id && session.status !== 'completed'));
    return [eligible ? [session] : [], []];
  }
  if (sql.startsWith('SELECT') && sql.includes('FROM bookings')) {
    return [[{ id: bookingId, customerId: owner, code: 'BK-9' }], []];
  }
  if (sql.startsWith('SELECT') && sql.includes('FROM payment_sessions')) return [[session], []];
  if (sql.startsWith('SELECT') && sql.includes('FROM payments')) return [[payment], []];
  if (sql.startsWith('UPDATE payment_sessions')) Object.assign(session, { session_id: values[0], status: values[1] });
  if (sql.startsWith('UPDATE payments')) payment.status = values[0];
  return [{ affectedRows: 1 }, []];
}

function expectNoCreation() {
  expect(createMidtrans).not.toHaveBeenCalled();
  expect(statements.some((sql) => /^INSERT INTO (payment_sessions|payments)/.test(sql))).toBe(false);
}

function expectReadOnly() {
  expectNoCreation();
  expect(pool.getConnection).not.toHaveBeenCalled();
  expect(statements.every((sql) => sql.startsWith('SELECT'))).toBe(true);
}

beforeEach(() => {
  vi.resetAllMocks();
  session = { id: 31, booking_id: bookingId, reference_id: 'mid-test', session_id: 'mid-test', method: 'qris',
    amount: '1200.00', status: 'active', checkout_url: null, expires_at: null };
  payment = { id: 7, booking_id: bookingId, method: 'qris', status: 'pending', gateway_reference: 'mid-test', amount: '1200.00' };
  statements = [];
  inTransaction = false;
  vi.mocked(pool.execute).mockImplementation(execute as never);
  vi.mocked(pool.getConnection).mockResolvedValue({
    execute,
    beginTransaction: vi.fn(async () => { inTransaction = true; }),
    commit: vi.fn(async () => { inTransaction = false; }),
    rollback: vi.fn(async () => { inTransaction = false; }),
    release: vi.fn(),
  } as never);
  vi.mocked(readMidtrans).mockImplementation(async () => {
    expect(inTransaction).toBe(false);
    return remote();
  });
});

describe('owned booking payment refresh', () => {
  it('settles pending Midtrans completion through verified event without creating a charge', async () => {
    await refreshBookingPayment(owner, bookingId);
    expect(payment.status).toBe('paid');
    expect(session.status).toBe('completed');
    expect(readMidtrans).toHaveBeenCalledTimes(2);
    expect(statements.filter((sql) => sql.startsWith('INSERT INTO notifications'))).toHaveLength(1);
    expectNoCreation();
  });

  it.each(['creating', 'unknown'])('recovers %s Midtrans session by reference when response binding was lost', async (status) => {
    Object.assign(session, { session_id: null, status });
    await refreshBookingPayment(owner, bookingId);
    expect(readMidtrans).toHaveBeenCalledWith('mid-test');
    expect(payment.status).toBe('paid');
    expect(session.session_id).toBe('mid-test');
    expectNoCreation();
  });

  it('ACTIVE remains read-only and creates nothing', async () => {
    vi.mocked(readMidtrans).mockResolvedValue(remote('ACTIVE'));
    await refreshBookingPayment(owner, bookingId);
    expect(payment.status).toBe('pending');
    expect(session.status).toBe('active');
    expectReadOnly();
  });

  it('Midtrans not-charged 404 remains unpaid and creates nothing', async () => {
    vi.mocked(readMidtrans).mockRejectedValue(new AppError(502, 'not charged', 'MIDTRANS_NOT_CHARGED'));
    await refreshBookingPayment(owner, bookingId);
    expect(payment.status).toBe('pending');
    expectReadOnly();
  });

  it('propagates other provider failures without creating anything', async () => {
    vi.mocked(readMidtrans).mockRejectedValue(new AppError(502, 'refund', 'MIDTRANS_RECONCILIATION_REQUIRED'));
    await expect(refreshBookingPayment(owner, bookingId)).rejects.toMatchObject({ code: 'MIDTRANS_RECONCILIATION_REQUIRED' });
    expectReadOnly();
  });

  it.each([[99, bookingId], [owner, 999]])('filters customer %s booking %s before provider access', async (customerId, id) => {
    await refreshBookingPayment(customerId, id);
    expect(pool.execute).toHaveBeenCalledWith(expect.any(String), [id, customerId]);
    expect(readMidtrans).not.toHaveBeenCalled();
    expectReadOnly();
  });

  it.each([
    { status: 'paid' }, { method: 'cash' }, { gateway_reference: 'mid-newer' },
  ])('no eligible current digital payment is a no-op: %j', async (change) => {
    Object.assign(payment, change);
    await refreshBookingPayment(owner, bookingId);
    expect(readMidtrans).not.toHaveBeenCalled();
    expectReadOnly();
  });

  it.each(['EXPIRED', 'CANCELED'] as const)('applies authoritative %s without creating a retry', async (status) => {
    vi.mocked(readMidtrans).mockImplementation(async () => remote(status));
    await refreshBookingPayment(owner, bookingId);
    expect(payment.status).toBe('expired');
    expect(session.status).toBe(status === 'CANCELED' ? 'canceled' : 'expired');
    expectNoCreation();
  });

  it.each(['expired', 'canceled'])('accepts late completion for current %s session', async (status) => {
    session.status = status;
    payment.status = 'expired';
    await refreshBookingPayment(owner, bookingId);
    expect(payment.status).toBe('paid');
    expectNoCreation();
  });

  it.each(['active', 'creating', 'unknown', 'completed'])('legacy %s refresh requires admin without network or mutations', async (status) => {
    Object.assign(session, { reference_id: 'cg-test', session_id: status === 'unknown' ? null : 'ps-test', status });
    payment.gateway_reference = 'cg-test';
    const before = structuredClone({ session, payment });
    await expect(refreshBookingPayment(owner, bookingId)).rejects.toMatchObject({
      statusCode: 409, code: 'PAYMENT_SESSION_CONFLICT', message: expect.stringContaining('hubungi admin'),
    });
    expect({ session, payment }).toEqual(before);
    expect(readMidtrans).not.toHaveBeenCalled();
    expectReadOnly();
  });

  it.each([{ method: 'cash' }, { gateway_reference: 'mid-newer' }])('legacy refresh remains blocked despite conflicting payment %j', async (change) => {
    Object.assign(session, { reference_id: 'cg-test' });
    Object.assign(payment, change);
    await expect(refreshBookingPayment(owner, bookingId)).rejects.toMatchObject({ code: 'PAYMENT_SESSION_CONFLICT' });
    expect(readMidtrans).not.toHaveBeenCalled();
    expectReadOnly();
  });

  it('legacy row behind newer session prevents refresh network or writes', async () => {
    vi.mocked(pool.execute).mockImplementationOnce(async () => [[session, { ...session, reference_id: 'cg-old' }], []] as never);
    await expect(refreshBookingPayment(owner, bookingId)).rejects.toMatchObject({ code: 'PAYMENT_SESSION_CONFLICT' });
    expect(readMidtrans).not.toHaveBeenCalled();
    expectReadOnly();
  });

  it.each(['ACTIVE', 'COMPLETED'] as const)('rejects mismatched %s identity before any apply/write', async (status) => {
    vi.mocked(readMidtrans).mockResolvedValue({ ...remote(status), referenceId: 'mid-other' });
    await expect(refreshBookingPayment(owner, bookingId)).rejects.toMatchObject({ statusCode: 409, code: 'PAYMENT_SESSION_CONFLICT' });
    expect(readMidtrans).toHaveBeenCalledOnce();
    expectReadOnly();
  });

  it.each([{ amount: 1201 }, { currency: 'USD' }, { sessionType: 'SAVE' }, { sessionId: 'mid-other' }])(
    'rejects remote mismatch %j', async (change) => {
      vi.mocked(readMidtrans).mockResolvedValue({ ...remote(), ...change } as ReturnType<typeof remote>);
      await expect(refreshBookingPayment(owner, bookingId)).rejects.toMatchObject({ statusCode: 409 });
      expectReadOnly();
    },
  );

  it('failed event re-verification throws 409 instead of reporting success', async () => {
    vi.mocked(readMidtrans).mockResolvedValueOnce(remote()).mockResolvedValueOnce({ ...remote(), amount: 1201 });
    await expect(refreshBookingPayment(owner, bookingId)).rejects.toMatchObject({ statusCode: 409, code: 'PAYMENT_SESSION_CONFLICT' });
    expect(payment.status).toBe('pending');
    expectReadOnly();
  });
});
