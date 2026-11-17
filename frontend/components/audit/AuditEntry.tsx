import { Initials } from '@/components/shared/ui';
import { auditDate, auditEntityName } from '@/lib/audit';
import { cn } from '@/lib/cn';
import { adminDemoEnabled } from '@/lib/demo/mode';
import type { AuditLog } from '@/types/audit';
import { AuditActionBadge } from './AuditActionBadge';
import { AuditDetailDialog } from './AuditDetailDialog';
import { AUDIT_COPY, entryGridClass } from './data';

/** Satu baris riwayat aktivitas admin. */
export function AuditEntry({ log }: { log: AuditLog }) {
  const { list } = AUDIT_COPY;
  const actorNote = log.isExample
    ? list.example
    : adminDemoEnabled()
      ? list.demoActor
      : list.actor;
  return (
    <li
      className={cn(
        entryGridClass,
        'border-b border-line-soft last:border-b-0 hover:bg-canvas',
      )}
    >
      <time dateTime={log.createdAt} className="grid gap-6 text-sm">
        <strong className="font-semibold text-ink">
          {auditDate(log.createdAt)}
        </strong>
        <span className="text-ink-muted">
          {auditDate(log.createdAt, true)} WIB
        </span>
      </time>
      <div className="flex min-w-0 items-center gap-10 max-lg:justify-self-end">
        <Initials
          name={log.admin.name}
          className="size-34 rounded-full text-xs max-sm:hidden"
        />
        <span className="grid min-w-0 gap-5">
          <strong className="text-sm break-words text-ink">
            {log.admin.name}
          </strong>
          <small className="text-xs text-ink-muted">{actorNote}</small>
        </span>
      </div>
      <div className="min-w-0 max-lg:col-span-2 max-lg:row-start-2">
        <AuditActionBadge action={log.action} />
        <h3 className="mt-7 mb-4 text-sm leading-[1.6] font-semibold break-words text-ink">
          {log.summary}
        </h3>
        <p className="text-xs leading-[1.5] break-words text-ink-muted">
          {auditEntityName(log.entityType)}
          {log.entityId ? ' · ' + log.entityId : ''}
        </p>
      </div>
      <div className="max-lg:col-span-2 max-lg:justify-self-end">
        <AuditDetailDialog log={log} />
      </div>
    </li>
  );
}
