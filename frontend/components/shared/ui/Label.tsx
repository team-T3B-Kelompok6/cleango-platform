import { cn } from '@/lib/cn';

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'text-base leading-[1.5] font-semibold text-ink-soft',
        className,
      )}
      {...props}
    />
  );
}
