import Link from 'next/link';
import Form from 'next/form';
import { UiIcon, buttonVariants } from '@/components/shared/ui';
import { auditActions, auditQuery } from '@/lib/audit';
import { cn } from '@/lib/cn';
import type { AuditAdmin, AuditFilters } from '@/types/audit';
import { AUDIT_COPY, inputClass, labelClass } from './data';

/** Form pencarian dan filter riwayat aktivitas (GET, tanpa state client). */
export function AuditFilterBar({
  filters,
  admins,
  selectedAdminMissing,
}: {
  filters: AuditFilters;
  admins: AuditAdmin[];
  selectedAdminMissing: boolean;
}) {
  const { filters: copy } = AUDIT_COPY;
  return (
    <Form
      action="/audit-log"
      key={auditQuery(filters)}
      className="grid grid-cols-4 gap-16 border-b border-line bg-canvas p-22 max-lg:grid-cols-2 max-lg:gap-14 max-sm:grid-cols-2 max-sm:gap-10 max-sm:p-16"
    >
      <label className={cn('col-span-2', labelClass)}>
        {copy.search}
        <input
          name="q"
          type="search"
          maxLength={150}
          placeholder={copy.searchPlaceholder}
          defaultValue={filters.q}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {copy.admin}
        <select
          name="adminId"
          defaultValue={filters.adminId}
          className={inputClass}
        >
          <option value="">{copy.allAdmins}</option>
          {selectedAdminMissing && (
            <option value={filters.adminId}>{copy.selectedAdmin}</option>
          )}
          {admins.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.name}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        {copy.action}
        <select
          name="action"
          defaultValue={filters.action}
          className={inputClass}
        >
          <option value="">{copy.allActions}</option>
          {Object.entries(auditActions).map(([action, label]) => (
            <option key={action} value={action}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        {copy.from}
        <input
          name="from"
          type="date"
          defaultValue={filters.from}
          max={filters.to || undefined}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {copy.to}
        <input
          name="to"
          type="date"
          defaultValue={filters.to}
          min={filters.from || undefined}
          className={inputClass}
        />
      </label>
      <div className="col-span-2 flex flex-wrap justify-end gap-8 self-end max-lg:col-span-2 max-sm:col-span-2 max-sm:[&>*]:flex-1">
        <button
          className={buttonVariants({ variant: 'primary', className: 'gap-6' })}
          type="submit"
        >
          <UiIcon name="search" />
          {copy.apply}
        </button>
        <Link
          href="/audit-log"
          className={buttonVariants({ variant: 'ghost' })}
        >
          {copy.reset}
        </Link>
      </div>
    </Form>
  );
}
