import type { FormState } from '@/types';

export type Action = (
  previous: FormState,
  form: FormData,
) => Promise<FormState>;

/** Kerangka form di dalam dialog: kolom dengan body yang bisa digulir. */
export const formClass = 'flex min-h-0 flex-1 flex-col';

/** Dua kolom rapat di desktop, satu kolom di bawah 700px. */
export const gridClass =
  'm-0 grid min-w-0 grid-cols-[repeat(2,minmax(0,1fr))] gap-x-16 gap-y-18 border-0 p-0 max-sm:grid-cols-1';

export const labelClass =
  'mb-8 block text-sm leading-[1.6] font-semibold text-ink';

export const hintClass = 'mt-6 block text-xs leading-[1.5] text-ink-muted';

export const errorClass = 'mt-4 block text-sm font-normal text-danger';

export const inputClass =
  'min-h-44 w-full min-w-0 rounded-control border border-line bg-surface px-12 py-11 text-base leading-[1.65] text-ink transition-colors focus:border-accent-ring aria-[invalid=true]:border-danger';

export const textareaClass =
  'w-full min-w-0 resize-y rounded-control border border-line bg-surface px-12 py-11 text-base leading-[1.65] text-ink transition-colors focus:border-accent-ring aria-[invalid=true]:border-danger';

export const readonlyClass =
  'min-h-44 w-full min-w-0 rounded-control border border-line bg-surface px-12 py-11 text-base leading-[1.65] text-ink-muted';

/** Ringkasan pemesan/petugas di atas form. */
export const panelClass =
  'flex flex-wrap items-center gap-12 rounded-card border border-line bg-canvas p-16';

export const panelTitleClass =
  'block text-base leading-[1.6] font-bold break-words';

export const panelCaptionClass =
  'mb-3 block text-xs leading-[1.5] text-ink-muted';

export const dangerGhostClass =
  'inline-flex items-center justify-center rounded-md border border-transparent bg-transparent px-16 py-9 text-md font-bold whitespace-nowrap text-danger transition-colors hover:bg-danger-soft disabled:opacity-45';
