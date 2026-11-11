import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

const PAGE_SIZE = 8;
const ACTIONS = new Set(['create', 'update', 'delete', 'assign', 'login']);
const SECRET = /password|passwd|token|secret|authorization|cookie|credential|api[_-]?key/i;
const SCHEDULE_FIELDS = new Set([
  'date', 'time', 'area', 'staff', 'status', 'resource', 'name', 'address',
  'phone', 'email', 'service', 'customer', 'notes', 'active', 'updatedAt',
]);

export interface AuditQuery {
  q?: string;
  adminId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
}

export interface AuditWrite {
  adminId: number | null;
  action: string;
  entityType: string;
  entityId: number | null;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

type Sql = Pool | PoolConnection;

function day(value: string | undefined, end: boolean): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parts = value.split('-');
  const yearText = parts[0];
  const monthText = parts[1];
  const dateText = parts[2];
  if (yearText === undefined || monthText === undefined || dateText === undefined) return null;
  const year = Number(yearText);
  const month = Number(monthText);
  const date = Number(dateText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(date)) return null;
  const start = new Date(Date.UTC(year, month - 1, date, -7));
  if (Number.isNaN(start.getTime())) return null;
  const wib = new Date(start.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
  if (wib !== value) return null;
  const stamp = end ? new Date(start.getTime() + 86_400_000) : start;
  return stamp.toISOString().slice(0, 19).replace('T', ' ');
}

function snapshot(value: unknown, depth = 0, allow?: ReadonlySet<string>): unknown {
  if (typeof value === 'string') return value.slice(0, 3000);
  if (typeof value === 'number' || typeof value === 'boolean' || value == null) return value;
  if (depth > 6 || typeof value !== 'object') return null;
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => snapshot(item, depth + 1));
  const entries = Object.entries(value).filter(([key]) => !SECRET.test(key) && (depth > 0 || !allow || allow.has(key)));
  return Object.fromEntries(entries.slice(0, 100).map(([key, entry]) => [key, snapshot(entry, depth + 1)]));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return Object.fromEntries(Object.entries(value));
}

function objectValue(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  return asRecord(value);
}

function visible(value: unknown, entityType: unknown): Record<string, unknown> | null {
  const raw = objectValue(value);
  if (!raw) return null;
  return asRecord(entityType === 'schedules' ? snapshot(raw, 0, SCHEDULE_FIELDS) : snapshot(raw));
}

export async function writeAudit(db: Sql, entry: AuditWrite): Promise<number> {
  if (!ACTIONS.has(entry.action)) throw new Error('Aksi audit tidak dikenal');
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO admin_audit_logs
      (admin_id, action, entity_type, entity_id, old_values, new_values, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [
      entry.adminId,
      entry.action,
      entry.entityType.slice(0, 80),
      entry.entityId,
      JSON.stringify(entry.entityType === 'schedules' ? snapshot(entry.before ?? null, 0, SCHEDULE_FIELDS) : snapshot(entry.before ?? null)),
      JSON.stringify({
        ...(objectValue(entry.entityType === 'schedules' ? snapshot(entry.after ?? null, 0, SCHEDULE_FIELDS) : snapshot(entry.after ?? null)) ?? {}),
        summary: entry.summary.slice(0, 300),
      }),
      entry.ipAddress?.slice(0, 45) ?? null,
    ],
  );
  return result.insertId;
}

export async function listAudit(db: Sql, query: AuditQuery) {
  const page = Number.isSafeInteger(query.page) && (query.page ?? 0) > 0 ? Number(query.page) : 1;
  const where: string[] = [];
  const params: Array<string | number> = [];
  if (query.adminId && /^\d+$/.test(query.adminId)) {
    where.push('l.admin_id = ?');
    params.push(Number(query.adminId));
  }
  if (query.action && ACTIONS.has(query.action)) {
    where.push('l.action = ?');
    params.push(query.action);
  }
  const from = day(query.from, false);
  const to = day(query.to, true);
  if (from) {
    where.push('l.created_at >= ?');
    params.push(from);
  }
  if (to) {
    where.push('l.created_at < ?');
    params.push(to);
  }
  if (query.q) {
    where.push(`(JSON_UNQUOTE(JSON_EXTRACT(l.new_values, '$.summary')) LIKE ?
      OR CAST(l.entity_id AS CHAR) LIKE ? OR u.name LIKE ? OR l.entity_type LIKE ?)`);
    params.push(...Array(4).fill(`%${query.q.slice(0, 150)}%`));
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [countRows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM admin_audit_logs l LEFT JOIN users u ON u.id = l.admin_id ${clause}`,
    params,
  );
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT l.id, l.admin_id, u.name AS admin_name, l.action, l.entity_type, l.entity_id,
            l.old_values, l.new_values, l.created_at
       FROM admin_audit_logs l LEFT JOIN users u ON u.id = l.admin_id
       ${clause}
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT ? OFFSET ?`,
    [...params, PAGE_SIZE, (page - 1) * PAGE_SIZE],
  );
  const [admins] = await db.execute<RowDataPacket[]>(
    `SELECT DISTINCT u.id, u.name FROM admin_audit_logs l
       JOIN users u ON u.id = l.admin_id ORDER BY u.name`,
  );
  return {
    data: rows.map((row) => {
      const rawAfter = objectValue(row.new_values);
      const summary = typeof rawAfter?.summary === 'string' ? rawAfter.summary : String(row.action);
      if (rawAfter) delete rawAfter.summary;
      return {
        id: String(row.id),
        admin: { id: String(row.admin_id ?? ''), name: String(row.admin_name ?? 'Admin') },
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id == null ? null : String(row.entity_id),
        summary,
        createdAt: new Date(row.created_at).toISOString(),
        before: visible(row.old_values, row.entity_type),
        after: visible(rawAfter, row.entity_type),
      };
    }),
    admins: admins.map((admin) => ({ id: String(admin.id), name: String(admin.name) })),
    meta: { total: Number(countRows[0]?.total ?? 0), page, pageSize: PAGE_SIZE },
  };
}
