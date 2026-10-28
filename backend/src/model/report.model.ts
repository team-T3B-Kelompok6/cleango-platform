import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';

export interface ReportSummary {
  from: string;
  to: string;
  revenue: number;
  paidOrders: number;
  completedOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  averageRating: number | null;
}

interface SummaryRow extends RowDataPacket {
  revenue: number | string | null;
  paidOrders: number;
  completedOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  averageRating: number | string | null;
}

/**
 * Revenue only counts payments the provider actually settled; booking values
 * alone are not income. Demo rows never reach this database.
 */
export async function getReportSummary(
  from: string,
  to: string,
): Promise<ReportSummary> {
  const [rows] = await pool.execute<SummaryRow[]>(
    `SELECT
       (SELECT COALESCE(SUM(p.amount), 0) FROM payments p
         WHERE p.status = 'paid' AND DATE(p.paid_at) BETWEEN ? AND ?) AS revenue,
       (SELECT COUNT(*) FROM payments p
         WHERE p.status = 'paid' AND DATE(p.paid_at) BETWEEN ? AND ?) AS paidOrders,
       (SELECT COUNT(*) FROM bookings b
         WHERE b.status = 'completed' AND DATE(b.completed_at) BETWEEN ? AND ?) AS completedOrders,
       (SELECT COUNT(*) FROM bookings b
         WHERE b.status IN ('confirmed','assigned','departed','en_route','in_progress')
           AND b.scheduled_date BETWEEN ? AND ?) AS activeOrders,
       (SELECT COUNT(*) FROM bookings b
         WHERE b.status = 'cancelled' AND b.scheduled_date BETWEEN ? AND ?) AS cancelledOrders,
       (SELECT AVG(r.rating) FROM reviews r
         WHERE DATE(r.created_at) BETWEEN ? AND ?) AS averageRating`,
    [from, to, from, to, from, to, from, to, from, to, from, to],
  );
  const row = rows[0];
  const rating = row?.averageRating === null ? null : Number(row?.averageRating);
  return {
    from,
    to,
    revenue: Number(row?.revenue ?? 0),
    paidOrders: Number(row?.paidOrders ?? 0),
    completedOrders: Number(row?.completedOrders ?? 0),
    activeOrders: Number(row?.activeOrders ?? 0),
    cancelledOrders: Number(row?.cancelledOrders ?? 0),
    averageRating: rating === null || Number.isNaN(rating) ? null : rating,
  };
}

export type RiskType =
  | 'late_departure'
  | 'late_arrival'
  | 'location_inactive'
  | 'no_show';
export type RiskSeverity = 'low' | 'medium' | 'high';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface RiskAlert {
  id: string;
  bookingId: string;
  bookingCode: string;
  customer: string;
  riskType: RiskType;
  severity: RiskSeverity;
  message: string;
  status: AlertStatus;
  detectedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

interface AlertRow extends RowDataPacket {
  id: number;
  bookingId: number;
  bookingCode: string;
  customer: string;
  riskType: RiskType;
  severity: RiskSeverity;
  message: string;
  status: AlertStatus;
  detectedAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
}

const ALERT_SELECT = `SELECT a.id, a.booking_id AS bookingId, b.booking_code AS bookingCode,
  u.name AS customer, a.risk_type AS riskType, a.severity, a.message, a.status,
  a.detected_at AS detectedAt, a.acknowledged_at AS acknowledgedAt,
  a.resolved_at AS resolvedAt
  FROM booking_risk_alerts a
  INNER JOIN bookings b ON b.id = a.booking_id
  INNER JOIN users u ON u.id = b.customer_id`;

function mapAlert(row: AlertRow): RiskAlert {
  return {
    id: String(row.id),
    bookingId: String(row.bookingId),
    bookingCode: row.bookingCode,
    customer: row.customer,
    riskType: row.riskType,
    severity: row.severity,
    message: row.message,
    status: row.status,
    detectedAt: new Date(row.detectedAt).toISOString(),
    acknowledgedAt: row.acknowledgedAt
      ? new Date(row.acknowledgedAt).toISOString()
      : null,
    resolvedAt: row.resolvedAt ? new Date(row.resolvedAt).toISOString() : null,
  };
}

const RISK_RULES: {
  type: RiskType;
  severity: RiskSeverity;
  where: string;
  message: string;
}[] = [
  {
    type: 'no_show',
    severity: 'high',
    where: `b.scheduled_date < CURDATE()
      AND b.status IN ('assigned','departed','en_route')`,
    message: 'Petugas belum menyelesaikan pesanan yang jadwalnya sudah lewat.',
  },
  {
    type: 'late_arrival',
    severity: 'medium',
    where: `b.scheduled_date = CURDATE()
      AND ADDTIME(b.scheduled_start_time, '00:30:00') < CURTIME()
      AND b.status IN ('assigned','departed','en_route')`,
    message: 'Petugas belum tiba 30 menit setelah jadwal mulai.',
  },
  {
    type: 'location_inactive',
    severity: 'low',
    where: `b.status = 'in_progress'
      AND ca.location_sharing_started_at IS NOT NULL
      AND ca.link_status = 'active'
      AND bs.location_updated_at IS NOT NULL
      AND bs.location_updated_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
    message: 'Lokasi petugas tidak diperbarui lebih dari 15 menit saat bekerja.',
  },
];

/** Rule-based scan; one active alert per booking and risk type. */
export async function detectRiskAlerts(): Promise<number> {
  let created = 0;
  for (const rule of RISK_RULES) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO booking_risk_alerts (booking_id, risk_type, severity, message)
       SELECT b.id, ?, ?, ?
       FROM bookings b
       LEFT JOIN cleaner_assignments ca ON ca.booking_id = b.id
       LEFT JOIN cleaner_task_stages bs ON bs.assignment_id = ca.id
       WHERE ${rule.where}
         AND NOT EXISTS (
           SELECT 1 FROM booking_risk_alerts existing
           WHERE existing.booking_id = b.id
             AND existing.risk_type = ?
             AND existing.status IN ('open','acknowledged')
         )`,
      [rule.type, rule.severity, rule.message, rule.type],
    );
    created += result.affectedRows;
  }
  return created;
}

export async function listRiskAlerts(
  status?: AlertStatus,
): Promise<RiskAlert[]> {
  const [rows] = status
    ? await pool.execute<AlertRow[]>(
        `${ALERT_SELECT} WHERE a.status = ? ORDER BY a.detected_at DESC, a.id DESC LIMIT 100`,
        [status],
      )
    : await pool.query<AlertRow[]>(
        `${ALERT_SELECT} ORDER BY a.detected_at DESC, a.id DESC LIMIT 100`,
      );
  return rows.map(mapAlert);
}

const STATUS_COLUMN: Record<'acknowledged' | 'resolved', string> = {
  acknowledged: 'acknowledged_at',
  resolved: 'resolved_at',
};

export async function updateAlertStatus(
  id: number,
  status: 'acknowledged' | 'resolved',
  adminId: number,
): Promise<RiskAlert | null> {
  const column = STATUS_COLUMN[status];
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE booking_risk_alerts SET status = ?,
       ${column} = COALESCE(${column}, NOW()),
       acknowledged_by = COALESCE(acknowledged_by, ?)
     WHERE id = ?`,
    [status, adminId, id],
  );
  if (!result.affectedRows) return null;
  const [rows] = await pool.execute<AlertRow[]>(
    `${ALERT_SELECT} WHERE a.id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ? mapAlert(rows[0]) : null;
}
