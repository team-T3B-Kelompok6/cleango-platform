'use client';
import Form from 'next/form';
import { usePathname, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/shared/ui/Icon';
import { SEARCH_LABELS, SHELL_COPY, searchTarget } from './data';

const headerClass =
  'flex h-38 w-[min(32.5rem,100%)] min-w-0 items-center gap-9 rounded-control border border-line bg-surface-soft px-12 focus-within:shadow-[0_0_0_2px_var(--color-accent-soft)] max-sm:hidden';

export function SearchField({
  mobile = false,
  faq = false,
}: {
  mobile?: boolean;
  faq?: boolean;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const section = '/' + (pathname.split('/')[1] ?? '');
  const action = searchTarget(section);
  const className = faq
    ? 'flex h-38 min-w-170 items-center gap-6 rounded-control border border-line bg-surface px-12 max-sm:w-full max-sm:flex-basis-full'
    : mobile
      ? 'mobile-search global-search'
      : headerClass;
  return (
    <Form action={action} className={className} key={params.get('q')}>
      <Icon name="search" className={faq ? 'size-[13px]' : undefined} />
      <input
        name="q"
        aria-label={SHELL_COPY.search}
        placeholder={
          faq
            ? 'Cari pertanyaan…'
            : `Cari di ${SEARCH_LABELS[section] ?? 'Cleango'}…`
        }
        defaultValue={params.get('q') ?? ''}
        className="w-full min-w-0 border-0 bg-transparent text-xs text-ink-soft outline-none placeholder:text-ink-faint max-sm:text-sm"
      />
      {Array.from(params.entries())
        .filter(([key]) => !['q', 'page', 'saved', 'deleted'].includes(key))
        .map(([key, value]) => (
          <input key={key} name={key} type="hidden" value={value} />
        ))}
      <button
        aria-label={SHELL_COPY.searchSubmit}
        type="submit"
        className="shrink-0 text-xl text-ink-muted opacity-0 transition-opacity focus-visible:opacity-100 focus-within:opacity-100"
      >
        <Icon name="arrow" />
      </button>
    </Form>
  );
}
