import {
  DialogBody,
  DialogCloseAction,
  DialogFooter,
  DialogTrigger,
  buttonVariants,
} from '@/components/ui';
import {
  auditChanges,
  auditDate,
  auditEntityName,
  auditFieldLabel,
  auditValueText,
} from '@/lib/audit';
import type { AuditLog } from '@/types/audit';
import { AuditActionBadge, AuditNeutralBadge } from './AuditActionBadge';
import { AUDIT_COPY } from '../data/auditCopy';

/** Dialog rincian satu aktivitas admin beserta perubahan nilainya. */
export function AuditDetailDialog({ log }: { log: AuditLog }) {
  const { detail, list } = AUDIT_COPY;
  const changes = auditChanges(log);
  return (
    <DialogTrigger
      label={detail.trigger}
      ariaLabel={'Lihat detail aktivitas ' + log.summary}
      title={detail.title}
      subtitle={'#' + log.id}
      icon="eye"
      dialogIcon="eye"
      wide
      className={buttonVariants({ variant: 'ghost', size: 'sm' })}
    >
      <DialogBody className="flex flex-col gap-20">
        <div className="rounded-[10px] border border-line bg-canvas p-18">
          <div className="flex flex-wrap items-center gap-8">
            <AuditActionBadge action={log.action} />
            {log.isExample && (
              <AuditNeutralBadge>{list.example}</AuditNeutralBadge>
            )}
          </div>
          <h3 className="mt-10 text-base leading-[1.5] font-semibold break-words text-ink">
            {log.summary}
          </h3>
          <dl className="mt-18 grid grid-cols-2 gap-16 max-sm:grid-cols-1 max-sm:gap-14">
            <div className="min-w-0">
              <dt className="mb-6 text-xs text-ink-muted">{detail.admin}</dt>
              <dd className="text-sm break-words">{log.admin.name}</dd>
            </div>
            <div className="min-w-0">
              <dt className="mb-6 text-xs text-ink-muted">{detail.time}</dt>
              <dd className="text-sm break-words">
                {auditDate(log.createdAt)} · {auditDate(log.createdAt, true)}{' '}
                WIB
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="mb-6 text-xs text-ink-muted">{detail.entity}</dt>
              <dd className="text-sm break-words">
                {auditEntityName(log.entityType)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="mb-6 text-xs text-ink-muted">{detail.entityId}</dt>
              <dd className="text-sm break-words">{log.entityId ?? '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="min-w-0">
          <h3 className="text-base leading-[1.5] font-semibold text-ink">
            {detail.changes}
          </h3>
          {changes.length ? (
            <div className="mt-12 overflow-hidden rounded-[10px] border border-line">
              <div
                aria-hidden="true"
                className="hidden grid-cols-[minmax(90px,0.8fr)_repeat(2,minmax(0,1fr))] gap-14 bg-surface-soft px-14 py-12 text-xs text-ink-muted lg:grid"
              >
                <span>{detail.column}</span>
                <span>{detail.before}</span>
                <span>{detail.after}</span>
              </div>
              {changes.map((change) => (
                <div
                  key={change.key}
                  className="grid grid-cols-[minmax(90px,0.8fr)_repeat(2,minmax(0,1fr))] gap-14 border-t border-line px-14 py-14 text-sm leading-[1.7] max-sm:grid-cols-2 max-sm:gap-10"
                >
                  <strong className="font-semibold text-ink max-sm:col-span-2">
                    {auditFieldLabel(change.key)}
                  </strong>
                  <div className="min-w-0 [overflow-wrap:anywhere] whitespace-pre-wrap">
                    <small className="mb-5 block text-xs text-ink-muted lg:hidden">
                      {detail.before}
                    </small>
                    <span className="sr-only">{detail.before}: </span>
                    {auditValueText(change.before)}
                  </div>
                  <div className="min-w-0 text-accent [overflow-wrap:anywhere] whitespace-pre-wrap">
                    <small className="mb-5 block text-xs text-ink-muted lg:hidden">
                      {detail.after}
                    </small>
                    <span className="sr-only">{detail.after}: </span>
                    {auditValueText(change.after)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-12 text-xs leading-[1.7] break-words text-ink-muted">
              {log.before === undefined && log.after === undefined
                ? detail.emptyBoth
                : detail.emptyValues}
            </p>
          )}
          <p className="mt-20 text-xs leading-[1.7] break-words text-ink-muted">
            {detail.id}
            {log.id}
          </p>
        </div>
      </DialogBody>
      <DialogFooter>
        <DialogCloseAction />
      </DialogFooter>
    </DialogTrigger>
  );
}
