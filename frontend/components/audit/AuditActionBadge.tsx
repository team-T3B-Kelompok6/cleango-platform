import { cn } from '@/lib/cn';
import { auditActions } from '@/lib/audit';
import type { AuditAction } from '@/types/audit';
import { actionTone, badgeClass } from './data';

/** Badge jenis aktivitas admin (tambah/ubah/hapus/penugasan/login). */
export function AuditActionBadge({
  action,
  label,
}: {
  action: AuditAction;
  label?: string;
}) {
  return (
    <span className={cn(badgeClass, actionTone[action])}>
      {label ?? auditActions[action]}
    </span>
  );
}

/** Badge netral untuk data contoh / aktivitas demo. */
export function AuditNeutralBadge({ children }: { children: string }) {
  return (
    <span className={cn(badgeClass, 'bg-surface-soft text-ink-muted')}>
      {children}
    </span>
  );
}
