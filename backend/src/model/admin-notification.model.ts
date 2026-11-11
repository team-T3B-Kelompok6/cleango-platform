import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';
import { AppError } from '../lib/AppError.js';

const MAX_BATCH = 8;

export async function markAdminNotificationsRead(
  adminId: number,
  bookingIds: number[],
): Promise<number> {
  if (!Array.isArray(bookingIds)) {
    throw new AppError(400, 'ID booking tidak valid', 'INVALID_BOOKING_IDS');
  }
  for (const id of bookingIds) {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new AppError(400, 'ID booking tidak valid', 'INVALID_BOOKING_IDS');
    }
  }
  const ids = bookingIds.slice(0, MAX_BATCH);
  if (!ids.length) return 0;
  const placeholders = ids.map(() => '(?, ?, NOW())').join(', ');
  const params: number[] = [];
  for (const id of ids) {
    params.push(adminId, id);
  }
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO admin_notification_receipts (admin_id, booking_id, read_at)
     VALUES ${placeholders}
     ON DUPLICATE KEY UPDATE read_at = read_at`,
    params,
  );
  return result.affectedRows;
}

interface ReadReceiptRow extends RowDataPacket {
  booking_id: number;
}

export async function listAdminReadReceipts(
  adminId: number,
): Promise<number[]> {
  const [rows] = await pool.execute<ReadReceiptRow[]>(
    `SELECT booking_id
     FROM admin_notification_receipts
     WHERE admin_id = ?`,
    [adminId],
  );
  return rows.map((row) => row.booking_id);
}