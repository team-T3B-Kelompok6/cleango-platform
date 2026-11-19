import { cn } from '@/lib/cn';

export function IconButton({
  label,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-control p-6 text-ink-muted transition-colors hover:bg-surface-tint',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
