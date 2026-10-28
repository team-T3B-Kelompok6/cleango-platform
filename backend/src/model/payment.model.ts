import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';
import { gatewayFor, type PaymentMethod } from '../lib/payment-gateway.js';
import {
  canTransitionPayment,
  PaymentTransitionError,
  type PaymentStatus,
} from '../lib/payment-status.js';

export const PAYMENT_METHODS: PaymentMethod[] = ['qris', 'cash', 'dana', 'gopay'];

export type StartPaymentResult =
  | { ok: true; status: PaymentStatus }
  | {
      ok: false;
      reason: 'NOT_FOUND' | 'CLOSED' | 'GATEWAY_UNAVAILABLE';
    };

export type WebhookResult =
  | { ok: true; status: PaymentStatus }
  | { ok: false; reason: 'NOT_FOUND' | 'AMOUNT_MISMATCH' };

const CLOSED_BOOKING_STATUSES = ['cancelled', 'completed'];

export async function startBookingPayment(
  customerId: number,
  bookingId: number,
  method: PaymentMethod,
): Promise<StartPaymentResult> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT b.id, b.status, b.total_amount AS total, pay.status AS paymentStatus
       FROM bookings b
       LEFT JOIN payments pay ON pay.booking_id = b.id
       WHERE b.id = ? AND b.customer_id = ?
       FOR UPDATE`,
      [bookingId, customerId],
    );
    const booking = rows[0];
    if (!booking) {
      await connection.rollback();
      return { ok: false, reason: 'NOT_FOUND' };
    }
    const current = (booking.paymentStatus as PaymentStatus | null) ?? null;
    if (current === 'paid') {
      await connection.rollback();
      return { ok: true, status: 'paid' };
    }
    if (CLOSED_BOOKING_STATUSES.includes(String(booking.status))) {
      await connection.rollback();
      return { ok: false, reason: 'CLOSED' };
    }
    const gateway = gatewayFor(method);
    if (!gateway) {
      await connection.rollback();
      return { ok: false, reason: 'GATEWAY_UNAVAILABLE' };
    }
    const charge = await gateway.createCharge({
      method,
      amount: Number(booking.total),
      bookingId,
    });
    await connection.execute(
      `INSERT INTO payments (booking_id, method, amount, status, gateway_reference)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         method = VALUES(method),
         amount = VALUES(amount),
         status = VALUES(status),
         gateway_reference = VALUES(gateway_reference),
         failed_reason = NULL`,
      [bookingId, method, Number(booking.total), charge.status, charge.reference],
    );
    await connection.commit();
    return { ok: true, status: charge.status };
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // rollback after an explicit rollback is a no-op
    }
    throw error;
  } finally {
    connection.release();
  }
}

/** Applies a provider webhook event after the gateway signature is verified. */
export async function applyPaymentEvent(event: {
  bookingId: number;
  status: 'paid' | 'failed' | 'expired';
  amount: number;
  reference: string | null;
}): Promise<WebhookResult> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT b.customer_id AS customerId, b.booking_code AS code,
         p.id AS paymentId, p.status AS paymentStatus, p.amount
       FROM bookings b
       LEFT JOIN payments p ON p.booking_id = b.id
       WHERE b.id = ?
       FOR UPDATE`,
      [event.bookingId],
    );
    const booking = rows[0];
    if (!booking || booking.paymentId === null) {
      await connection.rollback();
      return { ok: false, reason: 'NOT_FOUND' };
    }
    if (Math.round(Number(booking.amount)) !== Math.round(event.amount)) {
      // A webhook that does not match the stored amount is never trusted.
      await connection.rollback();
      return { ok: false, reason: 'AMOUNT_MISMATCH' };
    }
    const current = String(booking.paymentStatus) as PaymentStatus;
    if (current === event.status) {
      await connection.rollback();
      return { ok: true, status: current };
    }
    if (!canTransitionPayment(current, event.status)) {
      await connection.rollback();
      throw new PaymentTransitionError(current, event.status);
    }
    await connection.execute(
      `UPDATE payments SET status = ?,
         gateway_reference = COALESCE(?, gateway_reference),
         paid_at = CASE WHEN ? = 'paid' THEN NOW() ELSE paid_at END
       WHERE id = ?`,
      [event.status, event.reference, event.status, Number(booking.paymentId)],
    );
    if (event.status === 'paid') {
      await connection.execute(
        `INSERT INTO notifications (recipient_user_id, booking_id, type, title, message)
         VALUES (?, ?, 'payment', 'Pembayaran diterima', ?)`,
        [
          Number(booking.customerId),
          event.bookingId,
          `Pembayaran untuk pesanan ${booking.code} sudah diterima.`,
        ],
      );
    }
    await connection.commit();
    return { ok: true, status: event.status };
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // rollback after an explicit rollback is a no-op
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function findPaymentForBooking(
  customerId: number,
  bookingId: number,
): Promise<{ method: PaymentMethod; status: PaymentStatus; amount: number } | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT p.method, p.status, p.amount
     FROM payments p
     INNER JOIN bookings b ON b.id = p.booking_id
     WHERE p.booking_id = ? AND b.customer_id = ?
     LIMIT 1`,
    [bookingId, customerId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    method: row.method as PaymentMethod,
    status: row.status as PaymentStatus,
    amount: Number(row.amount),
  };
}
