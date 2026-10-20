import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';

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

const SELECT = `SELECT id, type, title, message, is_read AS isRead,
  created_at AS createdAt, booking_id AS bookingId
  FROM notifications`;

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
    `${SELECT} WHERE recipient_user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100`,
    [userId],
  );
  return rows.map(mapNotification);
}

export async function countUnreadNotifications(userId: number): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM notifications WHERE recipient_user_id = ? AND is_read = FALSE',
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
