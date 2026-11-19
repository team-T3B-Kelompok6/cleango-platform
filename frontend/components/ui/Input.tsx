import { UiIcon, type UiIconName } from '@/components/ui/UiIcon';
import { cn } from '@/lib/cn';

const inputClass =
  'h-48 w-full rounded-control border border-line bg-surface-soft py-0 pr-42 pl-38 text-lg text-ink ' +
  'focus:border-accent-bright focus:outline-3 focus:outline-accent-glow focus:outline-offset-0 ' +
  '[&:-webkit-autofill]:shadow-[inset_0_0_0_100rem_var(--color-surface-soft)] ' +
  '[&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-ink)]';

export function Input({
  icon,
  trailing,
  invalid,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: UiIconName;
  trailing?: React.ReactNode;
  invalid?: boolean;
}) {
  return (
    <span className="relative block">
      {icon && (
        <span className="pointer-events-none absolute top-1/2 left-13 -translate-y-1/2 text-xl text-ink-faint">
          <UiIcon name={icon} />
        </span>
      )}
      <input
        aria-invalid={invalid}
        className={cn(inputClass, className)}
        {...props}
      />
      {trailing}
    </span>
  );
}
