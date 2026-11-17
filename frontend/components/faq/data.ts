/** Kelas bersama halaman dan form FAQ. */

export const labelClass = 'mb-8 block text-sm font-semibold text-ink-soft';

export const inputClass =
  'min-h-44 w-full min-w-0 rounded-control border border-line bg-surface px-12 py-10 text-base text-ink aria-[invalid=true]:border-danger';

export const textareaClass =
  'w-full min-w-0 resize-y rounded-control border border-line bg-surface px-12 py-10 text-base leading-[1.7] text-ink aria-[invalid=true]:border-danger';

export const hintClass = 'mt-6 block text-xs leading-[1.5] text-ink-muted';

export const errorClass = 'mt-4 block text-sm text-danger';

export const noticeClass =
  'rounded-control bg-danger-soft p-10 text-sm leading-[1.6] text-danger';

export const rowClass =
  'rounded-card border border-line bg-surface p-16 transition-colors hover:border-line-strong';

export const metaClass =
  'flex flex-wrap items-center gap-8 text-xs leading-[1.5] text-ink-muted';

export const categoryTagClass: Record<string, string> = {
  green: 'bg-success-soft text-success',
  blue: 'bg-info-soft text-info',
  amber: 'bg-warning-soft text-warning',
  purple: 'bg-accent-soft text-accent',
};

export const categoryTagBase =
  'rounded-sm px-8 py-4 text-xs font-bold tracking-[0.02em]';

export const publishClass =
  'inline-flex items-center gap-5 rounded-sm bg-neutral-soft px-8 py-4 text-xs text-ink-soft';

export const questionClass =
  'mt-12 block text-lg leading-[1.3] font-semibold break-words text-ink';

export const answerClass =
  'text-base leading-[1.7] whitespace-pre-line text-ink-muted break-words';

export const answersRowClass =
  'mt-16 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-24 border-t border-line-soft pt-16 max-sm:grid-cols-1 max-sm:gap-14';
