import Link from 'next/link';
import { cn } from '@/lib/cn';
import { pageWindow } from '@/lib/pagination';

const baseClass =
  'inline-flex min-h-32 min-w-32 items-center justify-center rounded-control border px-8 text-sm transition-colors';
const idleClass = 'border-line bg-surface text-ink-soft hover:bg-surface-tint';
const activeClass = 'border-accent bg-accent font-semibold text-white';
const disabledClass = 'border-line bg-surface text-ink-soft opacity-45';

/** Navigasi halaman bernomor untuk daftar admin. */
export function Pagination({
  page,
  pageCount,
  from,
  to,
  total,
  href,
  label = 'Halaman daftar',
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  href: (page: number) => string;
  label?: string;
}) {
  if (!total) return null;
  return (
    <div className="mt-24 flex flex-wrap items-center justify-between gap-12 text-sm text-ink-muted">
      <span>
        Menampilkan {from}–{to} dari {total}
      </span>
      <nav aria-label={label} className="flex flex-wrap items-center gap-6">
        {page > 1 ? (
          <Link className={cn(baseClass, idleClass)} href={href(page - 1)}>
            Sebelumnya
          </Link>
        ) : (
          <button className={cn(baseClass, disabledClass)} disabled>
            Sebelumnya
          </button>
        )}
        {pageWindow(page, pageCount).map((value, index) =>
          value === '…' ? (
            <span key={'gap-' + index} className="px-4">
              …
            </span>
          ) : (
            <Link
              key={value}
              href={href(value)}
              aria-current={page === value ? 'page' : undefined}
              aria-label={'Halaman ' + value}
              className={cn(
                baseClass,
                page === value ? activeClass : idleClass,
              )}
            >
              {value}
            </Link>
          ),
        )}
        {page < pageCount ? (
          <Link className={cn(baseClass, idleClass)} href={href(page + 1)}>
            Berikutnya
          </Link>
        ) : (
          <button className={cn(baseClass, disabledClass)} disabled>
            Berikutnya
          </button>
        )}
      </nav>
    </div>
  );
}
