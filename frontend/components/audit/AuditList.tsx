import { auditPageRange } from '@/lib/audit';
import type { AuditLog, AuditPage } from '@/types/audit';
import { AuditEntry } from './AuditEntry';
import { AUDIT_COPY } from './data';

/** Judul daftar, kolom, dan baris riwayat aktivitas. */
export function AuditList({
  logs,
  page,
  meta,
}: {
  logs: AuditLog[];
  page: number;
  meta: AuditPage['meta'];
}) {
  const { list } = AUDIT_COPY;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-10 px-22 py-20 max-sm:px-16">
        <h2 className="text-md leading-[1.4] font-semibold text-ink">
          {list.title}
        </h2>
        <span className="text-xs text-ink-muted">
          {auditPageRange(page, meta)}
        </span>
      </div>
      <div
        aria-hidden="true"
        className="hidden grid-cols-[minmax(110px,0.85fr)_minmax(145px,1.1fr)_minmax(0,2fr)_110px] gap-16 border-y border-line-soft bg-canvas px-22 py-12 text-xs font-semibold text-ink-muted lg:grid"
      >
        {list.columns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
      <ol className="m-0 list-none p-0">
        {logs.map((log) => (
          <AuditEntry key={log.id} log={log} />
        ))}
      </ol>
    </>
  );
}
