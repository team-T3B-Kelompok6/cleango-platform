export type AuditAction = 'create' | 'update' | 'delete' | 'assign' | 'login';

export interface AuditAdmin {
  id: string;
  name: string;
}

export interface AuditLog {
  id: string;
  admin: AuditAdmin;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  summary: string;
  createdAt: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  isExample?: boolean;
}

export interface AuditFilters {
  q: string;
  adminId: string;
  action: string;
  from: string;
  to: string;
  page: number;
}

export interface AuditPage {
  data: AuditLog[];
  admins: AuditAdmin[];
  meta: { total: number; page: number; pageSize: number };
}
