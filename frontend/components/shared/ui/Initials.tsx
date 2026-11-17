import { cn } from '@/lib/cn';

/** Monogram inisial nama pada ringkasan pemesan/petugas. */
export function Initials({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('');
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-40 shrink-0 place-items-center rounded-card bg-accent-soft text-md font-bold text-accent uppercase',
        className,
      )}
    >
      {initials}
    </span>
  );
}
