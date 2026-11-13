import { randomUUID } from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { getEnv } from '../config/env.js';
import { pool } from '../lib/db.js';
import { insertPaymentAcceptedNotification, type CustomerNotificationEvent } from './notification.model.js';
import { notifyCustomerNotification } from '../lib/firebase-push.js';
import { AppError } from '../lib/AppError.js';
import type { PaymentMethod } from '../lib/payment-gateway.js';
import { readSession as readXenditSession } from '../lib/xendit.js';
import { createSession as createMidtransSession, readSession as readMidtransSession } from '../lib/midtrans.js';
import {
  canTransitionPayment,
  PaymentTransitionError,
  type PaymentStatus,
} from '../lib/payment-status.js';

export const PAYMENT_METHODS: PaymentMethod[] = ['qris', 'cash'];

export type StartPaymentResult =
  | { ok: true; status: PaymentStatus; checkoutUrl?: string | null; expiresAt?: string | null }
  | { ok: false; reason: 'NOT_FOUND' | 'CLOSED' | 'GATEWAY_UNAVAILABLE' };

export type WebhookResult =
  | { ok: true; status: PaymentStatus }
  | { ok: false; reason: 'NOT_FOUND' | 'AMOUNT_MISMATCH' };

type Session = RowDataPacket & {
  id: number;
  booking_id: number;
  reference_id: string;
  session_id: string | null;
  method: Exclude<PaymentMethod, 'cash'>;
  amount: number;
  checkout_url: string | null;
  expires_at: Date | string | null;
  status: 'creating' | 'active' | 'completed' | 'expired' | 'canceled' | 'unknown';
};
export type XenditSessionEvent = {
  sessionId: string;
  referenceId: string;
  status: 'paid' | 'expired';
  amount: number;
};

export type MidtransSessionEvent = XenditSessionEvent;
type Provider = 'xendit' | 'midtrans';
// ponytail: reference prefix distinguishes 2 providers; provider column when adding more.
const providerFor = (referenceId: string): Provider | null =>
  referenceId.startsWith('mid-') ? 'midtrans' : referenceId.startsWith('cg-') ? 'xendit' : null;
const readSession = (provider: Provider, sessionId: string) =>
  provider === 'midtrans' ? readMidtransSession(sessionId) : readXenditSession(sessionId);

const CLOSED_BOOKING_STATUSES = ['cancelled', 'completed'];
const conflict = () => new AppError(409, 'Sesi pembayaran sebelumnya belum dapat dipastikan. Tekan Cek Status Pembayaran; jika tetap gagal, hubungi admin. Tagihan baru diblokir untuk mencegah pembayaran ganda.', 'PAYMENT_SESSION_CONFLICT');
const validAmount = (value: number): boolean => Number.isSafeInteger(value) && value > 0;
const sameAmount = (left: number, right: number): boolean =>
  validAmount(left) && validAmount(right) && left === right;

/** All writers lock booking, then session, then payment. HTTP runs outside transactions. */
export async function startBookingPayment(
  customerId: number,
  bookingId: number,
  method: PaymentMethod,
): Promise<StartPaymentResult> {
  if (!PAYMENT_METHODS.includes(method)) return { ok: false, reason: 'GATEWAY_UNAVAILABLE' };
  const env = method === 'cash' ? null : getEnv();
  const connection = await pool.getConnection();
  let reservation: Session;
  try {
    await connection.beginTransaction();
    const [bookings] = await connection.execute<RowDataPacket[]>(
      'SELECT id, status, total_amount AS total FROM bookings WHERE id = ? AND customer_id = ? FOR UPDATE',
      [bookingId, customerId],
    );
    const booking = bookings[0];
    if (!booking) { await connection.rollback(); return { ok: false, reason: 'NOT_FOUND' }; }
    const [sessions] = await connection.execute<Session[]>(
      'SELECT * FROM payment_sessions WHERE booking_id = ? ORDER BY id DESC LIMIT 1 FOR UPDATE', [bookingId],
    );
    const latest = sessions[0];
    const [payments] = await connection.execute<RowDataPacket[]>(
      'SELECT * FROM payments WHERE booking_id = ? FOR UPDATE', [bookingId],
    );
    const payment = payments[0];
    if (payment?.status === 'paid') { await connection.rollback(); return { ok: true, status: 'paid' }; }
    if (CLOSED_BOOKING_STATUSES.includes(String(booking.status))) { await connection.rollback(); return { ok: false, reason: 'CLOSED' }; }
    if (latest && ['creating', 'unknown'].includes(latest.status)) throw conflict();
    if (method === 'cash') {
      if (latest?.status === 'active') throw conflict();
      await connection.execute(
        `INSERT INTO payments (booking_id, method, amount, status, gateway_reference)
         VALUES (?, 'cash', ?, 'pending', NULL)
         ON DUPLICATE KEY UPDATE method = 'cash', amount = VALUES(amount), status = 'pending',
           gateway_reference = NULL, failed_reason = NULL`, [bookingId, Number(booking.total)],
      );
      await confirmAwaitingPayment(connection, bookingId);
      await connection.commit();
      return { ok: true, status: 'pending' };
    }
    const provider = latest?.status === 'active' ? providerFor(latest.reference_id) : 'midtrans';
    if (!provider) throw conflict();
    if (provider === 'midtrans' ? !env?.MIDTRANS_SERVER_KEY : (!env?.XENDIT_SECRET_KEY || !env.XENDIT_WEBHOOK_TOKEN)) {
      await connection.rollback(); return { ok: false, reason: 'GATEWAY_UNAVAILABLE' };
    }
    if (payment?.method === 'cash') throw conflict();
    if (latest?.status === 'completed') throw conflict();
    if (latest?.status === 'active') {
      if (!latest.session_id || (payment && payment.gateway_reference !== latest.reference_id)) throw conflict();
      reservation = { ...latest, amount: Number(latest.amount) };
    } else {
      if (payment && (!latest || payment.gateway_reference !== latest.reference_id)) throw conflict();
      const amount = Number(booking.total);
      if (!validAmount(amount)) throw new AppError(422, 'Invalid booking payment amount', 'INVALID_PAYMENT_AMOUNT');
      const referenceId = `mid-${randomUUID()}`;
      const [insert] = await connection.execute<ResultSetHeader>(
        `INSERT INTO payment_sessions (booking_id, reference_id, method, amount, status)
         VALUES (?, ?, ?, ?, 'creating')`, [bookingId, referenceId, method, amount],
      );
      await connection.execute(
        `INSERT INTO payments (booking_id, method, amount, status, gateway_reference)
         VALUES (?, ?, ?, 'pending', ?)
         ON DUPLICATE KEY UPDATE method = VALUES(method), amount = VALUES(amount), status = 'pending',
           gateway_reference = VALUES(gateway_reference), failed_reason = NULL`,
        [bookingId, method, amount, referenceId],
      );
      reservation = { id: insert.insertId, booking_id: bookingId, reference_id: referenceId,
        session_id: null, method, amount, checkout_url: null, expires_at: null, status: 'creating' } as Session;
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }

  const provider = providerFor(reservation.reference_id);
  if (!provider) throw conflict();
  if (reservation.status === 'active') {
    const expiresAt = reservation.expires_at instanceof Date ? reservation.expires_at.toISOString() : reservation.expires_at;
    let remote: Awaited<ReturnType<typeof readSession>>;
    try { remote = await readSession(provider, reservation.session_id!); }
    catch (error) {
      if (provider === 'midtrans' && error instanceof AppError && error.code === 'MIDTRANS_NOT_CHARGED') {
        return { ok: true, status: 'pending', checkoutUrl: reservation.checkout_url, expiresAt };
      }
      throw error;
    }
    if (!matchesRemote(reservation, remote)) throw conflict();
    if (remote.status === 'COMPLETED' || remote.status === 'EXPIRED' || remote.status === 'CANCELED') {
      const applyEvent = provider === 'midtrans' ? applyMidtransSessionEvent : applyXenditSessionEvent;
      const result = await applyEvent({ sessionId: remote.sessionId, referenceId: remote.referenceId,
        status: remote.status === 'COMPLETED' ? 'paid' : 'expired', amount: remote.amount });
      if (!result.ok) throw conflict();
      return { ok: true, status: result.status, checkoutUrl: null, expiresAt: remote.expiresAt };
    }
    return { ok: true, status: 'pending', checkoutUrl: remote.checkoutUrl ?? reservation.checkout_url,
      expiresAt: remote.expiresAt ?? expiresAt };
  }

  try {
    const remote = await createMidtransSession({ referenceId: reservation.reference_id, bookingId, customerId,
      amount: Number(reservation.amount), method: reservation.method });
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('SELECT id FROM bookings WHERE id = ? FOR UPDATE', [bookingId]);
      const [sessions] = await conn.execute<Session[]>('SELECT * FROM payment_sessions WHERE id = ? FOR UPDATE', [reservation.id]);
      const current = sessions[0];
      const [payments] = await conn.execute<RowDataPacket[]>('SELECT * FROM payments WHERE booking_id = ? FOR UPDATE', [bookingId]);
      if (!current || (current.session_id && current.session_id !== remote.sessionId)) throw conflict();
      if (current.status === 'completed') {
        await conn.commit(); return { ok: true, status: 'paid' };
      }
      if (payments[0]?.gateway_reference !== reservation.reference_id) throw conflict();
      if (current.status !== 'creating') {
        await conn.commit(); return { ok: true, status: payments[0].status as PaymentStatus, checkoutUrl: null };
      }
      await conn.execute(
        `UPDATE payment_sessions SET session_id = ?, checkout_url = ?, expires_at = ?, status = 'active' WHERE id = ?`,
        [remote.sessionId, remote.checkoutUrl, remote.expiresAt ? new Date(remote.expiresAt) : null, reservation.id],
      );
      await conn.commit();
      return { ok: true, status: 'pending', checkoutUrl: remote.checkoutUrl, expiresAt: remote.expiresAt };
    } catch (error) { await conn.rollback(); throw error; }
    finally { conn.release(); }
  } catch (error) {
    // Timeout may mean remote creation succeeded. Never remove or reopen reservation.
    await pool.execute("UPDATE payment_sessions SET status = 'unknown' WHERE id = ? AND status = 'creating'", [reservation.id]);
    throw error;
  }
}

function matchesRemote(session: Session, remote: Awaited<ReturnType<typeof readXenditSession | typeof readMidtransSession>>): boolean {
  return remote.sessionId === session.session_id && remote.referenceId === session.reference_id &&
    remote.currency === 'IDR' && remote.sessionType === 'PAY' && sameAmount(Number(session.amount), remote.amount);
}

/** Authenticate webhook first. Remote read verifies identity/amount, even before response binding. */
export async function applyXenditSessionEvent(event: XenditSessionEvent): Promise<WebhookResult> {
  return applyProviderSessionEvent('xendit', event);
}

export async function applyMidtransSessionEvent(event: MidtransSessionEvent): Promise<WebhookResult> {
  return applyProviderSessionEvent('midtrans', event);
}

async function applyProviderSessionEvent(provider: Provider, event: XenditSessionEvent): Promise<WebhookResult> {
  if (providerFor(event.referenceId) !== provider) return { ok: false, reason: 'NOT_FOUND' };
  const [found] = await pool.execute<Session[]>('SELECT * FROM payment_sessions WHERE reference_id = ?', [event.referenceId]);
  const known = found[0];
  if (!known || known.reference_id !== event.referenceId || providerFor(known.reference_id) !== provider ||
      (known.session_id && known.session_id !== event.sessionId) ||
      (provider === 'midtrans' && event.sessionId !== event.referenceId)) return { ok: false, reason: 'NOT_FOUND' };
  const remote = await readSession(provider, event.sessionId);
  if (!matchesRemote({ ...known, session_id: event.sessionId } as Session, remote)) return { ok: false, reason: 'AMOUNT_MISMATCH' };
  if (!sameAmount(event.amount, remote.amount)) return { ok: false, reason: 'AMOUNT_MISMATCH' };
  const paid = remote.status === 'COMPLETED';
  if (!paid && (event.status === 'paid' || !['EXPIRED', 'CANCELED'].includes(remote.status))) throw conflict();
  const connection = await pool.getConnection();
  let notification: CustomerNotificationEvent | undefined;
  let committed = false;
  try {
    await connection.beginTransaction();
    const [bookings] = await connection.execute<RowDataPacket[]>(
      'SELECT id, customer_id AS customerId, booking_code AS code FROM bookings WHERE id = ? FOR UPDATE', [known.booking_id],
    );
    const booking = bookings[0];
    const [sessions] = await connection.execute<Session[]>(
      'SELECT * FROM payment_sessions WHERE id = ? FOR UPDATE', [known.id],
    );
    const session = sessions[0];
    const [payments] = await connection.execute<RowDataPacket[]>(
      'SELECT * FROM payments WHERE booking_id = ? FOR UPDATE', [known.booking_id],
    );
    const payment = payments[0];
    if (!booking || !session || session.reference_id !== event.referenceId ||
        (session.session_id && session.session_id !== event.sessionId)) {
      await connection.rollback(); return { ok: false, reason: 'NOT_FOUND' };
    }
    if (!sameAmount(Number(session.amount), remote.amount)) {
      await connection.rollback(); return { ok: false, reason: 'AMOUNT_MISMATCH' };
    }
    // Never settle cash or another session's payment, including a newer retry.
    if (!payment || payment.method === 'cash' || payment.gateway_reference !== session.reference_id) throw conflict();
    if (payment.status === 'paid' || session.status === 'completed') {
      await connection.commit(); return { ok: true, status: 'paid' };
    }
    if (!paid && ['expired', 'canceled'].includes(session.status)) {
      await connection.commit(); return { ok: true, status: payment.status as PaymentStatus };
    }
    await connection.execute(
      'UPDATE payment_sessions SET session_id = COALESCE(session_id, ?), status = ? WHERE id = ?',
      [event.sessionId, paid ? 'completed' : remote.status === 'CANCELED' ? 'canceled' : 'expired', session.id],
    );
    // Completion remains authoritative after expiry; duplicate events do not notify again.
    await connection.execute(
      `UPDATE payments SET status = ?, paid_at = CASE WHEN ? = 'paid' THEN COALESCE(paid_at, NOW()) ELSE paid_at END WHERE id = ?`,
      [paid ? 'paid' : 'expired', paid ? 'paid' : 'expired', payment.id],
    );
    if (paid) notification = await redeemAndNotify(connection, Number(booking.customerId), known.booking_id, String(booking.code));
    await connection.commit();
    committed = true;
    return { ok: true, status: paid ? 'paid' : 'expired' };
  } catch (error) { await connection.rollback(); throw error; }
  finally {
    connection.release();
    if (committed && notification) void notifyCustomerNotification(notification);
  }
}

async function confirmAwaitingPayment(connection: PoolConnection, bookingId: number): Promise<void> {
  await connection.execute(
    "UPDATE bookings SET status = 'confirmed' WHERE id = ? AND status = 'awaiting_payment'",
    [bookingId],
  );
}

async function redeemAndNotify(connection: PoolConnection, customerId: number, bookingId: number, code: string): Promise<CustomerNotificationEvent> {
  await confirmAwaitingPayment(connection, bookingId);
  await connection.execute("UPDATE promo_usages SET status = 'redeemed' WHERE booking_id = ? AND status = 'reserved'", [bookingId]);
  return insertPaymentAcceptedNotification(connection, customerId, bookingId, code);
}

/** Legacy path remains for cash tests/integrations; digital settles only through session verification. */
export async function applyPaymentEvent(event: {
  bookingId: number;
  status: 'paid' | 'failed' | 'expired';
  amount: number;
  reference: string | null;
}): Promise<WebhookResult> {
  const connection = await pool.getConnection();
  let notification: CustomerNotificationEvent | undefined;
  let committed = false;
  try {
    await connection.beginTransaction();
    const [bookings] = await connection.execute<RowDataPacket[]>(
      'SELECT customer_id AS customerId, booking_code AS code FROM bookings WHERE id = ? FOR UPDATE', [event.bookingId],
    );
    await connection.execute('SELECT id FROM payment_sessions WHERE booking_id = ? ORDER BY id DESC LIMIT 1 FOR UPDATE', [event.bookingId]);
    const [payments] = await connection.execute<RowDataPacket[]>(
      'SELECT * FROM payments WHERE booking_id = ? FOR UPDATE', [event.bookingId],
    );
    const booking = bookings[0];
    const payment = payments[0];
    if (!booking || !payment) { await connection.rollback(); return { ok: false, reason: 'NOT_FOUND' }; }
    if (payment.method !== 'cash') throw conflict();
    if (!sameAmount(Number(payment.amount), event.amount)) { await connection.rollback(); return { ok: false, reason: 'AMOUNT_MISMATCH' }; }
    const current = String(payment.status) as PaymentStatus;
    if (current === event.status) { await connection.rollback(); return { ok: true, status: current }; }
    if (!canTransitionPayment(current, event.status)) throw new PaymentTransitionError(current, event.status);
    await connection.execute(
      `UPDATE payments SET status = ?, gateway_reference = COALESCE(?, gateway_reference),
       paid_at = CASE WHEN ? = 'paid' THEN NOW() ELSE paid_at END WHERE id = ?`,
      [event.status, event.reference, event.status, payment.id],
    );
    if (event.status === 'paid') notification = await redeemAndNotify(connection, Number(booking.customerId), event.bookingId, String(booking.code));
    await connection.commit();
    committed = true;
    return { ok: true, status: event.status };
  } catch (error) { await connection.rollback(); throw error; }
  finally {
    connection.release();
    if (committed && notification) void notifyCustomerNotification(notification);
  }
}

/** Poll existing owned sessions only; never reserve or create a charge. */
export async function refreshBookingPayment(customerId: number, bookingId: number): Promise<void> {
  const [rows] = await pool.execute<Session[]>(
    `SELECT ps.* FROM payment_sessions ps
     INNER JOIN bookings b ON b.id = ps.booking_id
     INNER JOIN payments p ON p.booking_id = ps.booking_id AND p.gateway_reference = ps.reference_id
     WHERE ps.booking_id = ? AND b.customer_id = ?
       AND ps.status IN ('active', 'creating', 'unknown', 'expired', 'canceled')
       AND p.status IN ('pending', 'failed', 'expired') AND p.method <> 'cash'
     ORDER BY ps.id DESC LIMIT 1`,
    [bookingId, customerId],
  );
  const pending = rows[0];
  if (!pending) return;
  const provider = providerFor(pending.reference_id);
  if (!provider) throw conflict();
  const lookupId = pending.session_id ?? (provider === 'midtrans' ? pending.reference_id : null);
  if (!lookupId) return;

  let remote: Awaited<ReturnType<typeof readSession>>;
  try { remote = await readSession(provider, lookupId); }
  catch (error) {
    if (provider === 'midtrans' && error instanceof AppError && error.code === 'MIDTRANS_NOT_CHARGED') return;
    throw error;
  }
  if (!matchesRemote({ ...pending, session_id: lookupId } as Session, remote)) throw conflict();
  if (remote.status === 'COMPLETED' || remote.status === 'EXPIRED' || remote.status === 'CANCELED') {
    const applyEvent = provider === 'midtrans' ? applyMidtransSessionEvent : applyXenditSessionEvent;
    const result = await applyEvent({ sessionId: remote.sessionId, referenceId: remote.referenceId,
      status: remote.status === 'COMPLETED' ? 'paid' : 'expired', amount: remote.amount });
    if (!result.ok) throw conflict();
  }
}

export async function findPaymentForBooking(
  customerId: number,
  bookingId: number,
): Promise<{ method: PaymentMethod; status: PaymentStatus; amount: number } | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT p.method, p.status, p.amount FROM payments p
     INNER JOIN bookings b ON b.id = p.booking_id WHERE p.booking_id = ? AND b.customer_id = ? LIMIT 1`,
    [bookingId, customerId],
  );
  const row = rows[0];
  return row ? { method: row.method as PaymentMethod, status: row.status as PaymentStatus, amount: Number(row.amount) } : null;
}
