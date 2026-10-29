import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';
import type { Promo } from './promo.model.js';

export type NotificationType = 'order' | 'payment' | 'promo' | 'risk_alert' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  bookingId: string | null;
}

interface NotificationRow extends RowDataPacket {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: number;
  createdAt: Date;
  bookingId: number | null;
}

const SELECT = `SELECT n.id, n.type, n.title, n.message, n.is_read AS isRead,
  n.created_at AS createdAt, n.booking_id AS bookingId
  FROM notifications n`;
const PROMO_VISIBLE = `n.type <> 'promo' OR (
  p.id IS NOT NULL AND p.is_active = TRUE
  AND p.starts_at <= NOW() AND p.ends_at > NOW()
  AND (p.quota IS NULL OR p.used_count < p.quota)
)`;
const PROMO_JOIN = 'LEFT JOIN promos p ON p.id = n.promo_id';

function mapNotification(row: NotificationRow): Notification {
  return {
    id: String(row.id),
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: Boolean(row.isRead),
    createdAt: row.createdAt.toISOString(),
    bookingId: row.bookingId === null ? null : String(row.bookingId),
  };
}

export async function listNotifications(userId: number): Promise<Notification[]> {
  const [rows] = await pool.execute<NotificationRow[]>(
    `${SELECT} ${PROMO_JOIN}
     WHERE n.recipient_user_id = ? AND (${PROMO_VISIBLE})
     ORDER BY n.created_at DESC, n.id DESC LIMIT 100`,
    [userId],
  );
  return rows.map(mapNotification);
}

export async function countUnreadNotifications(userId: number): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM notifications n ${PROMO_JOIN}
     WHERE n.recipient_user_id = ? AND n.is_read = FALSE
       AND (${PROMO_VISIBLE})`,
    [userId],
  );
  return Number(rows[0]?.total ?? 0);
}

export async function markNotificationRead(
  userId: number,
  id: number,
): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE notifications SET is_read = TRUE, read_at = NOW()
     WHERE id = ? AND recipient_user_id = ?`,
    [id, userId],
  );
  return result.affectedRows > 0;
}

function rupiah(value: number): string {
  return `Rp${Number(value).toLocaleString('id-ID')}`;
}

function promoMessage(promo: Promo): string {
  const discount =
    promo.discountType === 'percentage'
      ? `${promo.discountValue}%${
          promo.maxDiscount === null ? '' : ` (maks. ${rupiah(promo.maxDiscount)})`
        }`
      : rupiah(promo.discountValue);
  const minimum =
    promo.minPurchase > 0 ? ` Min. transaksi ${rupiah(promo.minPurchase)}.` : '';
  return `Kode ${promo.code}: diskon ${discount}. Berlaku ${promo.startsOn} sampai ${promo.endsOn}.${minimum}`;
}

export async function upsertPromoNotifications(promo: Promo): Promise<number> {
  const title = `Promo baru: ${promo.name}`;
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO notifications
       (recipient_user_id, promo_id, type, title, message)
     SELECT id, ?, 'promo', ?, ?
     FROM users
     WHERE role = 'customer' AND is_active = TRUE
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       message = VALUES(message),
       is_read = FALSE,
       read_at = NULL,
       created_at = NOW()`,
    [Number(promo.id), title, promoMessage(promo)],
  );
  return result.affectedRows;
}

export async function purgeOldNotifications(): Promise<number> {
  let deleted = 0;
  while (true) {
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM notifications
       WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 MONTH)
       ORDER BY created_at
       LIMIT 1000`,
    );
    deleted += result.affectedRows;
    if (result.affectedRows < 1000) return deleted;
  }
}

export async function insertBookingNotification(
  connection: { execute: typeof pool.execute },
  userId: number,
  bookingId: number,
  bookingCode: string,
  scheduledLabel: string,
): Promise<void> {
  await connection.execute(
    `INSERT INTO notifications (recipient_user_id, booking_id, type, title, message)
     VALUES (?, ?, 'order', ?, ?)`,
    [
      userId,
      bookingId,
      'Pesanan Dikonfirmasi',
      `Pesanan ${bookingCode} untuk ${scheduledLabel} telah dibuat dan menunggu penugasan cleaner.`,
    ],
  );
}
