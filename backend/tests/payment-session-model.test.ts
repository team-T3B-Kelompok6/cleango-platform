import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/db.js', () => ({ pool: { getConnection: vi.fn(), execute: vi.fn() } }));
vi.mock('../src/lib/xendit.js', () => ({ createSession: vi.fn(), readSession: vi.fn() }));
vi.mock('../src/lib/midtrans.js', () => ({ createSession: vi.fn(), readSession: vi.fn() }));
vi.mock('../src/config/env.js', () => ({ getEnv: vi.fn() }));
vi.mock('../src/lib/firebase-push.js', () => ({ notifyCustomerNotification: vi.fn().mockResolvedValue(undefined) }));

import { pool } from '../src/lib/db.js';
import { notifyCustomerNotification } from '../src/lib/firebase-push.js';
import { AppError } from '../src/lib/AppError.js';
import { getEnv } from '../src/config/env.js';
import { createSession, readSession } from '../src/lib/xendit.js';
import { createSession as createMidtransSession, readSession as readMidtransSession } from '../src/lib/midtrans.js';
import { applyPaymentEvent, applyMidtransSessionEvent, applyXenditSessionEvent, startBookingPayment } from '../src/model/payment.model.js';

type Row = Record<string, unknown>;
let booking: Row | undefined;
let session: Row | undefined;
let payment: Row | undefined;
let inTransaction: boolean;
let notifications: number;
let redemptions: number;
let statements: string[];
const event = { sessionId: 'ps-test', referenceId: 'cg-test', status: 'paid' as const, amount: 1200 };

function seed(status = 'active', paymentStatus = 'pending') {
  session = { id: 31, booking_id: 9, reference_id: 'cg-test', session_id: 'ps-test', method: 'qris',
    amount: '1200.00', checkout_url: 'https://checkout.xendit.co/test', expires_at: null, status };
  payment = { id: 7, method: 'qris', gateway_reference: 'cg-test', amount: '1200.00', status: paymentStatus };
}

function midtransRemote(status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELED' = 'ACTIVE') {
  return { sessionId: String(session?.reference_id ?? 'mid-test'), referenceId: String(session?.reference_id ?? 'mid-test'), status,
    amount: 1200, currency: 'IDR' as const, sessionType: 'PAY' as const, checkoutUrl: null, expiresAt: null };
}

function remote(status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELED' = 'COMPLETED') {
  return { sessionId: 'ps-test', referenceId: String(session?.reference_id ?? 'cg-test'), status,
    amount: 1200, currency: 'IDR' as const, sessionType: 'PAY' as const,
    checkoutUrl: 'https://checkout.xendit.co/test', expiresAt: null };
}

async function execute(sql: string, values: unknown[] = []) {
  statements.push(sql);
  if (sql.startsWith('SELECT') && sql.includes('FROM bookings')) return [[...(booking ? [booking] : [])], []];
  if (sql.startsWith('SELECT') && sql.includes('FROM payment_sessions')) return [[...(session ? [session] : [])], []];
  if (sql.startsWith('SELECT') && sql.includes('FROM payments')) return [[...(payment ? [payment] : [])], []];
  if (sql.startsWith('INSERT INTO payment_sessions')) {
    session = { id: 31, booking_id: values[0], reference_id: values[1], method: values[2], amount: values[3], status: 'creating', session_id: null };
    return [{ insertId: 31 }, []];
  }
  if (sql.startsWith('INSERT INTO payments')) {
    payment = { id: 7, method: values[1], amount: values[2], status: 'pending', gateway_reference: values[3] };
  }
  if (sql.startsWith('UPDATE payment_sessions')) {
    if (sql.includes("status = 'unknown'")) {
      if (session?.status === 'creating') session.status = 'unknown';
    } else if (sql.includes('checkout_url')) {
      Object.assign(session!, { session_id: values[0], checkout_url: values[1], expires_at: values[2], status: 'active' });
    } else Object.assign(session!, { session_id: values[0], status: values[1] });
  }
  if (sql.startsWith('UPDATE payments')) payment!.status = values[0];
  if (sql.startsWith("UPDATE bookings SET status = 'confirmed'") && booking?.status === 'awaiting_payment') booking.status = 'confirmed';
  if (sql.startsWith('UPDATE promo_usages')) redemptions++;
  if (sql.startsWith('INSERT INTO notifications')) {
    notifications++;
    return [{ insertId: 88, affectedRows: 1 }, []];
  }
  return [{ affectedRows: 1 }, []];
}

beforeEach(() => {
  vi.resetAllMocks();
  booking = { id: 9, status: 'confirmed', total: '1200.00', customerId: 4, code: 'BK-9' };
  session = undefined;
  payment = undefined;
  inTransaction = false;
  notifications = 0;
  redemptions = 0;
  statements = [];
  vi.mocked(getEnv).mockReturnValue({ MIDTRANS_SERVER_KEY: 'secret', XENDIT_SECRET_KEY: 'secret', XENDIT_WEBHOOK_TOKEN: 'token' } as ReturnType<typeof getEnv>);
  vi.mocked(notifyCustomerNotification).mockImplementation(async () => { expect(inTransaction).toBe(false); });
  vi.mocked(pool.execute).mockImplementation(execute as never);
  vi.mocked(pool.getConnection).mockImplementation(async () => ({
    beginTransaction: vi.fn(async () => { expect(inTransaction).toBe(false); inTransaction = true; }),
    commit: vi.fn(async () => { inTransaction = false; }),
    rollback: vi.fn(async () => { inTransaction = false; }),
    release: vi.fn(),
    execute,
  }) as never);
  vi.mocked(createMidtransSession).mockImplementation(async (input) => {
    expect(inTransaction).toBe(false);
    expect(session?.status).toBe('creating');
    expect(payment?.gateway_reference).toBe(input.referenceId);
    expect(input.amount).toBe(1200);
    expect(input.referenceId).toMatch(/^mid-[0-9a-f-]{36}$/);
    expect(input.referenceId.length).toBeLessThanOrEqual(50);
    return { sessionId: input.referenceId, checkoutUrl: 'https://app.sandbox.midtrans.com/snap/test', expiresAt: null };
  });
  vi.mocked(readMidtransSession).mockImplementation(async () => {
    expect(inTransaction).toBe(false);
    return midtransRemote();
  });
  vi.mocked(readSession).mockImplementation(async () => {
    expect(inTransaction).toBe(false);
    return remote();
  });
});

describe('durable provider reservations', () => {
  it.each([false, true])('cash confirms awaiting booking including existing pending payment=%s', async (existing) => {
    booking!.status = 'awaiting_payment';
    if (existing) payment = { id: 7, method: 'cash', status: 'pending', amount: 1200 };
    expect(await startBookingPayment(4, 9, 'cash')).toEqual({ ok: true, status: 'pending' });
    expect(booking?.status).toBe('confirmed');
    expect(notifications).toBe(0);
  });
  it.each(['awaiting_payment', 'cancelled', 'completed'])('paid settlement only confirms awaiting state, not %s terminal state', async (initial) => {
    seed();
    booking!.status = initial;
    expect(await applyXenditSessionEvent(event)).toEqual({ ok: true, status: 'paid' });
    expect(booking?.status).toBe(initial === 'awaiting_payment' ? 'confirmed' : initial);
    expect(notifications).toBe(1);
    await applyXenditSessionEvent(event);
    expect(notifications).toBe(1);
    expect(notifyCustomerNotification).toHaveBeenCalledOnce();
  });
  it('commits Midtrans reservation and pending payment before HTTP; binds order ID', async () => {
    vi.mocked(getEnv).mockReturnValue({ MIDTRANS_SERVER_KEY: 'secret' } as ReturnType<typeof getEnv>);
    expect(await startBookingPayment(4, 9, 'qris')).toEqual({ ok: true, status: 'pending',
      checkoutUrl: 'https://app.sandbox.midtrans.com/snap/test', expiresAt: null });
    expect(session?.status).toBe('active');
    expect(session?.session_id).toBe(session?.reference_id);
    expect(session?.expires_at).toBeNull();
    expect(payment?.status).toBe('pending');
    expect(createMidtransSession).toHaveBeenCalledOnce();
    expect(createSession).not.toHaveBeenCalled();
    expect(statements.findIndex((sql) => sql.includes('FROM bookings'))).toBeLessThan(statements.findIndex((sql) => sql.includes('FROM payment_sessions')));
  });

  it.each(['gopay', 'dana'] as const)('rejects new %s payments before DB or provider access', async (method) => {
    expect(await startBookingPayment(4, 9, method)).toEqual({ ok: false, reason: 'GATEWAY_UNAVAILABLE' });
    expect(pool.getConnection).not.toHaveBeenCalled();
    expect(createMidtransSession).not.toHaveBeenCalled();
  });

  it('missing Midtrans configuration makes no DB reservation', async () => {
    vi.mocked(getEnv).mockReturnValue({ MIDTRANS_SERVER_KEY: '' } as ReturnType<typeof getEnv>);
    expect(await startBookingPayment(4, 9, 'qris')).toEqual({ ok: false, reason: 'GATEWAY_UNAVAILABLE' });
    expect(session).toBeUndefined();
    expect(payment).toBeUndefined();
    expect(createMidtransSession).not.toHaveBeenCalled();
  });

  it.each(['creating', 'unknown'])('rejects retries and cash against %s reservations for both providers', async (status) => {
    for (const referenceId of ['cg-test', 'mid-test']) {
      seed(status);
      session!.reference_id = referenceId;
      payment!.gateway_reference = referenceId;
      await expect(startBookingPayment(4, 9, 'qris')).rejects.toMatchObject({ statusCode: 409 });
      await expect(startBookingPayment(4, 9, 'cash')).rejects.toMatchObject({ statusCode: 409 });
    }
    expect(createSession).not.toHaveBeenCalled();
    expect(createMidtransSession).not.toHaveBeenCalled();
  });

  it('timeout marks unknown and never blindly creates again', async () => {
    vi.mocked(createMidtransSession).mockRejectedValueOnce(new Error('timeout'));
    await expect(startBookingPayment(4, 9, 'qris')).rejects.toThrow('timeout');
    expect(session?.status).toBe('unknown');
    await expect(startBookingPayment(4, 9, 'qris')).rejects.toMatchObject({ statusCode: 409 });
    expect(createMidtransSession).toHaveBeenCalledOnce();
  });

  it('reuses stored Snap URL when status endpoint says order not charged', async () => {
    session = { id: 31, booking_id: 9, reference_id: 'mid-test', session_id: 'mid-test', method: 'qris', amount: '1200.00',
      checkout_url: 'https://app.sandbox.midtrans.com/snap/test', expires_at: null, status: 'active' };
    payment = { id: 7, method: 'qris', gateway_reference: 'mid-test', amount: '1200.00', status: 'pending' };
    vi.mocked(readMidtransSession).mockRejectedValue(new AppError(502, 'not charged', 'MIDTRANS_NOT_CHARGED'));
    expect(await startBookingPayment(4, 9, 'qris')).toEqual({ ok: true, status: 'pending', checkoutUrl: session.checkout_url, expiresAt: null });
    expect(createMidtransSession).not.toHaveBeenCalled();
    vi.mocked(readMidtransSession).mockResolvedValue(midtransRemote());
    session.expires_at = new Date('2026-11-12T10:00:00Z');
    expect(await startBookingPayment(4, 9, 'qris')).toEqual({ ok: true, status: 'pending', checkoutUrl: session.checkout_url, expiresAt: '2026-11-12T10:00:00.000Z' });
    vi.mocked(readMidtransSession).mockRejectedValue(new AppError(502, 'refund', 'MIDTRANS_RECONCILIATION_REQUIRED'));
    await expect(startBookingPayment(4, 9, 'qris')).rejects.toMatchObject({ code: 'MIDTRANS_RECONCILIATION_REQUIRED' });
  });

  it('reuses verified active URL, blocks cash, creates no duplicate session', async () => {
    seed();
    vi.mocked(readSession).mockResolvedValue(remote('ACTIVE'));
    expect(await startBookingPayment(4, 9, 'qris')).toMatchObject({ ok: true, status: 'pending', checkoutUrl: 'https://checkout.xendit.co/test' });
    await expect(startBookingPayment(4, 9, 'cash')).rejects.toMatchObject({ statusCode: 409 });
    expect(createSession).not.toHaveBeenCalled();
  });

  it('expiry reconciles payment; next explicit retry gets new reference', async () => {
    seed();
    vi.mocked(readSession).mockImplementation(async () => { expect(inTransaction).toBe(false); return remote('EXPIRED'); });
    expect(await startBookingPayment(4, 9, 'qris')).toMatchObject({ ok: true, status: 'expired', checkoutUrl: null });
    expect(payment?.status).toBe('expired');
    expect(createSession).not.toHaveBeenCalled();
    expect(await startBookingPayment(4, 9, 'qris')).toMatchObject({ ok: true, status: 'pending' });
    expect(payment?.gateway_reference).not.toBe('cg-test');
  });

  it('does not overwrite completion delivered before creation response', async () => {
    vi.mocked(createMidtransSession).mockImplementationOnce(async () => {
      expect(inTransaction).toBe(false);
      vi.mocked(readMidtransSession).mockResolvedValue(midtransRemote('COMPLETED'));
      expect(await applyMidtransSessionEvent({ ...event, sessionId: String(session!.reference_id), referenceId: String(session!.reference_id) })).toEqual({ ok: true, status: 'paid' });
      return { sessionId: String(session!.reference_id), checkoutUrl: 'https://app.sandbox.midtrans.com/snap/test', expiresAt: null };
    });
    expect(await startBookingPayment(4, 9, 'qris')).toEqual({ ok: true, status: 'paid' });
    expect(session?.status).toBe('completed');
    expect(notifications).toBe(1);
  });

  it('timeout after webhook completion cannot downgrade completed reservation', async () => {
    vi.mocked(createMidtransSession).mockImplementationOnce(async () => {
      vi.mocked(readMidtransSession).mockResolvedValue(midtransRemote('COMPLETED'));
      await applyMidtransSessionEvent({ ...event, sessionId: String(session!.reference_id), referenceId: String(session!.reference_id) });
      throw new Error('response lost');
    });
    await expect(startBookingPayment(4, 9, 'qris')).rejects.toThrow('response lost');
    expect(session?.status).toBe('completed');
    expect(payment?.status).toBe('paid');
    expect(await startBookingPayment(4, 9, 'qris')).toEqual({ ok: true, status: 'paid' });
    expect(notifications).toBe(1);
  });

  it('binding DB failure rolls back and conservatively marks reservation unknown', async () => {
    const rollback = vi.fn(async () => { inTransaction = false; });
    const release = vi.fn();
    vi.mocked(createMidtransSession).mockImplementationOnce(async () => {
      vi.mocked(pool.getConnection).mockResolvedValueOnce({
        beginTransaction: async () => { inTransaction = true; },
        commit: async () => { inTransaction = false; },
        rollback,
        release,
        execute: async (sql: string, values: unknown[]) => {
          if (sql.startsWith('UPDATE payment_sessions')) throw new Error('DB unavailable');
          return execute(sql, values);
        },
      } as never);
      return { sessionId: 'ps-test', checkoutUrl: 'https://checkout.xendit.co/test', expiresAt: null };
    });
    await expect(startBookingPayment(4, 9, 'qris')).rejects.toThrow('DB unavailable');
    expect(rollback).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
    expect(session?.status).toBe('unknown');
  });

  it('rejects fractional IDR and unauthorized bookings before HTTP', async () => {
    booking!.total = '1200.10';
    await expect(startBookingPayment(4, 9, 'qris')).rejects.toMatchObject({ code: 'INVALID_PAYMENT_AMOUNT' });
    booking = undefined;
    expect(await startBookingPayment(4, 9, 'qris')).toEqual({ ok: false, reason: 'NOT_FOUND' });
    expect(createSession).not.toHaveBeenCalled();
  });
});

describe('verified session settlement', () => {
  it('settles Midtrans completion idempotently and rejects cross-provider events', async () => {
    session = { id: 31, booking_id: 9, reference_id: 'mid-test', session_id: 'mid-test', method: 'qris', amount: '1200.00',
      checkout_url: 'https://app.sandbox.midtrans.com/snap/test', expires_at: null, status: 'active' };
    payment = { id: 7, method: 'qris', gateway_reference: 'mid-test', amount: '1200.00', status: 'pending' };
    vi.mocked(readMidtransSession).mockResolvedValue(midtransRemote('COMPLETED'));
    const midEvent = { sessionId: 'mid-test', referenceId: 'mid-test', status: 'paid' as const, amount: 1200 };
    expect(await applyXenditSessionEvent(midEvent)).toEqual({ ok: false, reason: 'NOT_FOUND' });
    expect(await applyMidtransSessionEvent(midEvent)).toEqual({ ok: true, status: 'paid' });
    expect(await applyMidtransSessionEvent(midEvent)).toEqual({ ok: true, status: 'paid' });
    expect(payment?.status).toBe('paid');
    expect(notifications).toBe(1);
    expect(notifyCustomerNotification).toHaveBeenCalledOnce();
    expect(notifyCustomerNotification).toHaveBeenCalledWith(expect.objectContaining({ notificationId: '88', bookingId: 9, type: 'payment' }));
  });

  it('rejects Midtrans callback amount mismatch and preserves paid on expiry', async () => {
    session = { id: 31, booking_id: 9, reference_id: 'mid-test', session_id: 'mid-test', method: 'qris', amount: '1200.00', checkout_url: null, expires_at: null, status: 'completed' };
    payment = { id: 7, method: 'qris', gateway_reference: 'mid-test', amount: '1200.00', status: 'paid' };
    vi.mocked(readMidtransSession).mockResolvedValue(midtransRemote('COMPLETED'));
    expect(await applyMidtransSessionEvent({ sessionId: 'mid-test', referenceId: 'mid-test', status: 'paid', amount: 1201 })).toEqual({ ok: false, reason: 'AMOUNT_MISMATCH' });
    vi.mocked(readMidtransSession).mockResolvedValue(midtransRemote('EXPIRED'));
    expect(await applyMidtransSessionEvent({ sessionId: 'mid-test', referenceId: 'mid-test', status: 'expired', amount: 1200 })).toEqual({ ok: true, status: 'paid' });
    expect(payment?.status).toBe('paid');
  });

  it('accepts late completion after expiry, redeems and notifies once', async () => {
    seed('expired', 'expired');
    expect(await applyXenditSessionEvent(event)).toEqual({ ok: true, status: 'paid' });
    expect(await applyXenditSessionEvent(event)).toEqual({ ok: true, status: 'paid' });
    expect(session?.status).toBe('completed');
    expect(payment?.status).toBe('paid');
    expect(notifications).toBe(1);
    expect(redemptions).toBe(1);
  });

  it('ignores expiry after paid without downgrading session', async () => {
    seed('completed', 'paid');
    vi.mocked(readSession).mockResolvedValue(remote('EXPIRED'));
    expect(await applyXenditSessionEvent({ ...event, status: 'expired' })).toEqual({ ok: true, status: 'paid' });
    expect(session?.status).toBe('completed');
    expect(payment?.status).toBe('paid');
    expect(notifications).toBe(0);
  });

  it.each([
    { amount: 1200.1 }, { amount: 1201 }, { referenceId: 'cg-other' },
    { sessionId: 'ps-other' }, { currency: 'USD' }, { sessionType: 'SAVE' },
  ])('rejects remote mismatch %j', async (change) => {
    seed();
    vi.mocked(readSession).mockResolvedValue({ ...remote(), ...change } as ReturnType<typeof remote>);
    expect(await applyXenditSessionEvent(event)).toEqual({ ok: false, reason: 'AMOUNT_MISMATCH' });
    expect(payment?.status).toBe('pending');
    expect(notifications).toBe(0);
  });

  it('rejects wrong callback amount and session ID', async () => {
    seed();
    expect(await applyXenditSessionEvent({ ...event, amount: 1200.01 })).toEqual({ ok: false, reason: 'AMOUNT_MISMATCH' });
    expect(await applyXenditSessionEvent({ ...event, sessionId: 'ps-other' })).toEqual({ ok: false, reason: 'NOT_FOUND' });
    expect(notifications).toBe(0);
  });

  it.each([
    { method: 'cash', gateway_reference: null },
    { method: 'qris', gateway_reference: 'cg-newer' },
  ])('does not silently overwrite conflicting payment %j', async (change) => {
    seed();
    Object.assign(payment!, change);
    await expect(applyXenditSessionEvent(event)).rejects.toMatchObject({ statusCode: 409 });
    expect(session?.status).toBe('active');
    expect(payment?.status).toBe('pending');
    expect(notifications).toBe(0);
  });

  it('generic legacy event cannot settle digital payment', async () => {
    seed();
    await expect(applyPaymentEvent({ bookingId: 9, status: 'paid', amount: 1200, reference: 'cg-test' })).rejects.toMatchObject({ statusCode: 409 });
    expect(payment?.status).toBe('pending');
  });

  it('active polling checks failed reconciliation before reporting paid', async () => {
    seed();
    vi.mocked(readSession).mockResolvedValueOnce(remote()).mockResolvedValueOnce({ ...remote(), amount: 1201 });
    await expect(startBookingPayment(4, 9, 'qris')).rejects.toMatchObject({ statusCode: 409 });
    expect(payment?.status).toBe('pending');
  });
});
