/** Kelas bersama popup kategori. */
import type { Category } from '@/types';

export type ManagedCategory = Category & {
  serviceCount: number;
  iconSrc?: string | null;
};

export const labelClass = 'mb-8 block text-sm font-semibold text-ink-soft';

export const inputClass =
  'min-h-44 w-full min-w-0 rounded-control border border-line bg-surface px-12 py-10 text-base text-ink aria-[invalid=true]:border-danger';

export const hintClass = 'mt-8 block text-xs leading-[1.5] text-ink-muted';

export const errorClass = 'mt-4 block text-sm text-danger';

export const helpClass = 'text-base leading-[1.6] text-ink-muted';

export const noticeClass =
  'rounded-control bg-danger-soft p-10 text-sm leading-[1.6] text-danger';

export const managerBarClass =
  'mb-18 mt-12 flex flex-wrap items-center justify-between gap-12 text-ink-muted';

export const managerActionsClass =
  'flex flex-wrap items-center gap-8 max-sm:w-full max-sm:[&>*]:flex-1';
