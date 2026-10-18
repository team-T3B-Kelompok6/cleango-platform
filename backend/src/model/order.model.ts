import type { RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';

type DatabaseOrderStatus =
  | 'awaiting_payment'
  | 'confirmed'
  | 'assigned'
  | 'departed'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

interface OrderRow extends RowDataPacket {
  id: number;
  customerId: number;
  customer: string;
  address: string;
  latitude: number | string | null;
  longitude: number | string | null;
  service: string;
  price: number;
  date: string;
  time: string;
  staffNames: string;
  databaseStatus: DatabaseOrderStatus;
  notes: string;
}

export interface Order {
  id: string;
  customerId: string;
  customer: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  service: string;
  price: number;
  date: string;
  time: string;
  staff: string[];
  status:
    | 'Menunggu Assign'
    | 'Menunggu Lokasi'
    | 'Sedang Dikerjakan'
    | 'Selesai'
    | 'Batal';
  notes: string;
}

const orderSelect = `SELECT b.id, b.customer_id AS customerId,
  u.name AS customer,
  CONCAT_WS(', ', a.street_address, a.city, a.province) AS address,
  a.latitude, a.longitude,
  s.name AS service, b.total_amount AS price,
  DATE_FORMAT(b.scheduled_date, '%Y-%m-%d') AS date,
  TIME_FORMAT(b.scheduled_start_time, '%H:%i') AS time,
  COALESCE((
    SELECT GROUP_CONCAT(c.name ORDER BY ca.assigned_at SEPARATOR '|||')
    FROM cleaner_assignments ca
    INNER JOIN cleaners c ON c.id = ca.cleaner_id
    WHERE ca.booking_id = b.id
  ), '') AS staffNames,
  b.status AS databaseStatus,
  COALESCE(b.customer_notes, '') AS notes
  FROM bookings b
  INNER JOIN users u ON u.id = b.customer_id
  INNER JOIN addresses a ON a.id = b.address_id
  INNER JOIN services s ON s.id = b.service_id`;

function apiStatus(status: DatabaseOrderStatus): Order['status'] {
  if (status === 'in_progress') return 'Sedang Dikerjakan';
  if (status === 'completed') return 'Selesai';
  if (status === 'cancelled') return 'Batal';
  if (['assigned', 'departed', 'en_route'].includes(status))
    return 'Menunggu Lokasi';
  return 'Menunggu Assign';
}

function mapOrder(row: OrderRow): Order {
  return {
    id: String(row.id),
    customerId: String(row.customerId),
    customer: row.customer,
    address: row.address,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    service: row.service,
    price: row.price,
    date: row.date,
    time: row.time,
    staff: row.staffNames ? row.staffNames.split('|||') : [],
    status: apiStatus(row.databaseStatus),
    notes: row.notes,
  };
}

export async function listOrders(): Promise<Order[]> {
  const [rows] = await pool.query<OrderRow[]>(
    `${orderSelect} ORDER BY b.created_at DESC, b.id DESC`,
  );
  return rows.map(mapOrder);
}

export async function findOrder(id: number): Promise<Order | null> {
  const [rows] = await pool.query<OrderRow[]>(
    `${orderSelect} WHERE b.id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ? mapOrder(rows[0]) : null;
}
