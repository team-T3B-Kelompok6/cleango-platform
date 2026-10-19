import type { RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';

export interface ChatPromo extends RowDataPacket {
  code: string;
  name: string;
  description: string | null;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maximumDiscount: number | null;
  minimumOrder: number;
  endsAt: string;
}

export async function listChatPromos(): Promise<ChatPromo[]> {
  const [rows] = await pool.query<ChatPromo[]>(
    `SELECT code, name, description, discount_type AS discountType,
     discount_value AS discountValue, maximum_discount AS maximumDiscount,
     minimum_order AS minimumOrder,
     DATE_FORMAT(ends_at, '%Y-%m-%d %H:%i:%s') AS endsAt
     FROM promos WHERE is_active = 1 AND starts_at <= NOW() AND ends_at > NOW()
       AND (quota IS NULL OR used_count < quota)
     ORDER BY ends_at, id LIMIT 20`,
  );
  return rows;
}

export interface ChatOrder extends RowDataPacket {
  bookingCode: string;
  service: string;
  status: string;
  date: string;
  time: string;
  paymentStatus: string | null;
}

// Ownership is enforced in SQL, before any order data reaches the chatbot.
export async function findChatOrder(
  customerId: number,
  reference?: string,
): Promise<ChatOrder | null> {
  const [rows] = await pool.execute<ChatOrder[]>(
    `SELECT b.booking_code AS bookingCode, s.name AS service, b.status,
     DATE_FORMAT(b.scheduled_date, '%Y-%m-%d') AS date,
     TIME_FORMAT(b.scheduled_start_time, '%H:%i') AS time,
     p.status AS paymentStatus
     FROM bookings b
     INNER JOIN users u ON u.id = b.customer_id AND u.is_active = 1
     INNER JOIN services s ON s.id = b.service_id
     LEFT JOIN payments p ON p.booking_id = b.id
     WHERE b.customer_id = ?
       AND (? IS NULL OR b.booking_code = ? OR CAST(b.id AS CHAR) = ?)
     ORDER BY b.created_at DESC, b.id DESC LIMIT 1`,
    [customerId, reference ?? null, reference ?? null, reference ?? null],
  );
  return rows[0] ?? null;
}
