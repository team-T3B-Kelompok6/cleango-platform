import { cn } from '@/lib/cn';

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        'rounded-[16px] border border-line bg-surface px-22 py-27 shadow-raised',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
