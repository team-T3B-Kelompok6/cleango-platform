import 'server-only';
import { ApiError, request } from './api';
import { auditActions, auditQuery, auditSnapshot } from './audit';
import type { AuditFilters, AuditLog, AuditPage } from '@/types/audit';

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
function validLog(value: unknown): value is AuditLog {
  if (!object(value) || !object(value.admin)) return false;
  return (
    typeof value.id === 'string' &&
    !!value.id &&
    (value.isExample === undefined || typeof value.isExample === 'boolean') &&
    typeof value.admin.id === 'string' &&
    !!value.admin.id &&
    typeof value.admin.name === 'string' &&
    !!value.admin.name.trim() &&
    typeof value.action === 'string' &&
    Object.hasOwn(auditActions, value.action) &&
    typeof value.entityType === 'string' &&
    !!value.entityType &&
    typeof value.summary === 'string' &&
    !!value.summary.trim() &&
    (value.entityId === null || typeof value.entityId === 'string') &&
    typeof value.createdAt === 'string' &&
    /(?:Z|[+-]\d{2}:\d{2})$/.test(value.createdAt) &&
    Number.isFinite(Date.parse(value.createdAt)) &&
    ['before', 'after'].every(
      (key) =>
        value[key] === undefined || value[key] === null || object(value[key]),
    )
  );
}

export async function listAuditLogs(filters: AuditFilters): Promise<AuditPage> {
  const result = await request<unknown>('/audit-logs?' + auditQuery(filters));
  if (
    !object(result) ||
    !Array.isArray(result.data) ||
    !result.data.every(validLog) ||
    !Array.isArray(result.admins) ||
    !result.admins.every(
      (admin) =>
        object(admin) &&
        typeof admin.id === 'string' &&
        typeof admin.name === 'string',
    ) ||
    !object(result.meta) ||
    !Number.isSafeInteger(result.meta.total) ||
    Number(result.meta.total) < 0 ||
    Number(result.meta.total) < result.data.length ||
    !Number.isSafeInteger(result.meta.pageSize) ||
    Number(result.meta.pageSize) < 1 ||
    Number(result.meta.pageSize) > 100 ||
    result.meta.page !== filters.page ||
    result.data.length > Number(result.meta.pageSize)
  )
    throw new ApiError('Format riwayat aktivitas tidak sesuai.', 502);
  return {
    ...(result as unknown as AuditPage),
    data: result.data.map((log) => ({
      ...log,
      ...(log.before !== undefined
        ? { before: auditSnapshot(log.before) as AuditLog['before'] }
        : {}),
      ...(log.after !== undefined
        ? { after: auditSnapshot(log.after) as AuditLog['after'] }
        : {}),
    })),
  };
}
