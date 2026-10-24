import { randomUUID } from 'node:crypto';
import { auditSnapshot, auditEntityName } from '../audit';
import type { AuditAction, AuditLog } from '@/types/audit';

export interface DemoAuditStore {
  auditLogs?: AuditLog[];
  auditSeeded?: boolean;
}

export function recordDemoAudit(
  store: DemoAuditStore,
  action: AuditAction,
  entityType: string,
  entityId: string | null,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) {
  const name = String(
    after?.name ??
      before?.name ??
      after?.question ??
      before?.question ??
      entityId ??
      'Admin',
  );
  const verbs = {
    create: 'Menambahkan',
    update: 'Mengubah',
    delete: 'Menghapus',
    assign: 'Mengatur penugasan',
    login: 'Masuk ke portal admin',
  };
  (store.auditLogs ??= []).unshift({
    id: 'DEMO-AUDIT-' + randomUUID(),
    admin: { id: 'demo-admin', name: 'Admin Operasional' },
    action,
    entityType,
    entityId,
    summary:
      action === 'login'
        ? verbs.login
        : `${verbs[action]} ${auditEntityName(entityType).toLowerCase()} ${name}`,
    createdAt: new Date().toISOString(),
    before: auditSnapshot(before) as AuditLog['before'],
    after: auditSnapshot(after) as AuditLog['after'],
  });
}

export function seedAuditExamples(store: DemoAuditStore) {
  if (store.auditSeeded) return;
  const examples: {
    action: AuditAction;
    entityType: string;
    name: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
  }[] = [
    {
      action: 'update',
      entityType: 'services',
      name: 'Deep Cleaning Rumah',
      before: { name: 'Deep Cleaning Rumah', price: 300000, active: true },
      after: { name: 'Deep Cleaning Rumah', price: 350000, active: true },
    },
    {
      action: 'create',
      entityType: 'categories',
      name: 'Perawatan taman',
      before: null,
      after: { name: 'Perawatan taman', resource: 'services' },
    },
    {
      action: 'assign',
      entityType: 'orders',
      name: 'DEMO-ORDER-01',
      before: { staff: [], status: 'Menunggu Assign' },
      after: { staff: ['Petugas Contoh'], status: 'Menunggu Lokasi' },
    },
    {
      action: 'update',
      entityType: 'faqs',
      name: 'Metode pembayaran',
      before: { question: 'Metode pembayaran', published: false },
      after: { question: 'Metode pembayaran', published: true },
    },
    {
      action: 'delete',
      entityType: 'promos',
      name: 'Promo Oktober',
      before: { name: 'Promo Oktober', code: 'CONTOH10', active: false },
      after: null,
    },
    {
      action: 'create',
      entityType: 'staff',
      name: 'Petugas Contoh',
      before: null,
      after: { name: 'Petugas Contoh', area: 'Malang', status: 'Tersedia' },
    },
    {
      action: 'update',
      entityType: 'schedules',
      name: 'Shift pagi',
      before: { time: '08.00–12.00 WIB' },
      after: { time: '09.00–13.00 WIB' },
    },
    {
      action: 'login',
      entityType: 'auth',
      name: 'Admin Layanan',
      before: null,
      after: null,
    },
  ];
  const now = Date.now();
  const logs: AuditLog[] = examples.map((item, index) => ({
    id: 'DEMO-AUDIT-EXAMPLE-' + index,
    admin:
      index % 2
        ? { id: 'demo-service-admin', name: 'Admin Layanan' }
        : { id: 'demo-admin', name: 'Admin Operasional' },
    action: item.action,
    entityType: item.entityType,
    entityId: 'DEMO-EXAMPLE-' + (index + 1),
    summary:
      item.action === 'login'
        ? 'Masuk ke portal admin'
        : `${{ create: 'Menambahkan', update: 'Mengubah', delete: 'Menghapus', assign: 'Mengatur penugasan' }[item.action]} ${item.name}`,
    createdAt: new Date(now - (index * 9 + 1) * 3600000).toISOString(),
    before: item.before,
    after: item.after,
    isExample: true,
  }));
  (store.auditLogs ??= []).push(...logs);
  store.auditSeeded = true;
}
