import { cn } from '@/lib/cn';

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-48 w-full rounded-control border border-line bg-surface-soft px-13 text-lg text-ink',
        'focus:border-accent-bright focus:outline-3 focus:outline-accent-glow focus:outline-offset-0',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
