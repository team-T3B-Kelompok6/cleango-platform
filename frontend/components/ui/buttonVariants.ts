import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'ghost' | 'accent' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'border-accent bg-accent text-white hover:border-accent-active hover:bg-accent-active',
  ghost:
    'border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-surface-tint',
  accent: 'border-transparent bg-transparent text-accent hover:bg-accent-soft',
  danger:
    'border-danger bg-danger text-white hover:border-danger hover:bg-danger hover:brightness-95',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'min-h-36 gap-6 px-12 py-8 text-sm',
  md: 'min-h-40 gap-8 px-14 py-8 text-base',
  lg: 'min-h-48 gap-10 px-18 py-10 text-lg',
};

/** Kelas tombol untuk elemen non-`<button>`, mis. `<Link>`. */
export function buttonVariants({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    'inline-flex items-center justify-center rounded-md border font-bold whitespace-nowrap transition-colors',
    variantClass[variant],
    sizeClass[size],
    className,
  );
}
